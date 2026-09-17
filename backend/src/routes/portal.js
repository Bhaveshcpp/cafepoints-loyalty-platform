const express=require("express");const crypto=require("crypto");const Member=require("../models/Member");const Reward=require("../models/Reward");const Transaction=require("../models/Transaction");const QrCode=require("../models/QrCode");const {getTier,getNextTier}=require("../utils/tiers");
const PointLot=require("../models/PointLot");
const {notifyTierChange}=require("../services/notificationService");
const router=express.Router();
const phone=x=>String(x||"").replace(/\D/g,"");
function serialize(m){const t=getTier(m.lifetimePoints);return{id:m._id,name:m.name,phone:m.phone,referralCode:m.referralCode,lifetimePoints:m.lifetimePoints,currentBalance:m.currentBalance,tier:t.name,nextTier:getNextTier(m.lifetimePoints)?.name||null}}
router.get("/member",async(req,res)=>{const p=phone(req.query.phone);if(!p)return res.status(400).json({error:"phone is required"});const member=await Member.findOne({phone:p});if(!member)return res.status(404).json({error:"No member found for this number"});const [rewards,transactions]=await Promise.all([Reward.find({active:true}).sort({pointsCost:1}),Transaction.find({member:member._id}).sort({createdAt:-1}).limit(50).populate("reward","name")]);res.json({member:serialize(member),rewards,transactions})});
router.post("/member/:id/redeem",async(req,res)=>{
 const reward=await Reward.findOne({_id:req.body.rewardId,active:true});if(!reward)return res.status(404).json({error:"Reward not found"});
 const member=await Member.findById(req.params.id);if(!member)return res.status(404).json({error:"Member not found"});
 const lots=await PointLot.find({member:member._id,remaining:{$gt:0},expiresAt:{$gt:new Date()}}).sort({earnedAt:1});
 let left=reward.pointsCost;for(const lot of lots){if(!left)break;const use=Math.min(left,lot.remaining);lot.remaining-=use;await lot.save();left-=use;}
 if(left>0 || member.currentBalance<reward.pointsCost)return res.status(400).json({error:"Not enough points"});
 member.currentBalance-=reward.pointsCost;await member.save();
 const tx=await Transaction.create({member:member._id,type:"redemption",reward:reward._id,pointsSpent:reward.pointsCost,balanceAfter:member.currentBalance});
 const token=crypto.randomBytes(18).toString("hex");const expiresAt=new Date(Date.now()+15*60*1000);await QrCode.create({token,type:"redemption",member:member._id,reward:reward._id,points:reward.pointsCost,expiresAt});
 const transactions=await Transaction.find({member:member._id}).sort({createdAt:-1}).limit(50).populate("reward","name");res.json({member:serialize(member),transactions,token,expiresAt,reward,transactionId:tx._id});
});

router.post("/referral",async(req,res)=>{
 const phoneValue=phone(req.body.phone),code=String(req.body.referralCode||"").trim().toUpperCase();if(!phoneValue||!code)return res.status(400).json({error:"phone and referralCode are required"});
 const member=await Member.findOne({phone:phoneValue});const referrer=await Member.findOne({referralCode:code});if(!member||!referrer)return res.status(404).json({error:"Member or referral code not found"});
 if(member._id.equals(referrer._id))return res.status(400).json({error:"You cannot use your own referral code"});if(member.referredBy)return res.status(409).json({error:"Referral already applied"});
 const BONUS=100; const oldRefTier=getTier(referrer.lifetimePoints).name; const oldMemberTier=getTier(member.lifetimePoints).name;
 member.referredBy=referrer._id;member.lifetimePoints+=BONUS;member.currentBalance+=BONUS;await member.save();
 referrer.lifetimePoints+=BONUS;referrer.currentBalance+=BONUS;await referrer.save();
 const txs=await Transaction.insertMany([{member:referrer._id,type:"bonus",pointsEarned:BONUS,balanceAfter:referrer.currentBalance},{member:member._id,type:"bonus",pointsEarned:BONUS,balanceAfter:member.currentBalance}]);
 const expiry=()=>new Date(Date.now()+90*24*60*60*1000);await PointLot.insertMany([{member:referrer._id,transaction:txs[0]._id,points:BONUS,remaining:BONUS,earnedAt:new Date(),expiresAt:expiry()},{member:member._id,transaction:txs[1]._id,points:BONUS,remaining:BONUS,earnedAt:new Date(),expiresAt:expiry()}]);
 const newRefTier=getTier(referrer.lifetimePoints).name;const newMemberTier=getTier(member.lifetimePoints).name;
 if(oldRefTier!==newRefTier) await notifyTierChange({member:referrer,fromTier:oldRefTier,toTier:newRefTier,lifetimePoints:referrer.lifetimePoints});
 if(oldMemberTier!==newMemberTier) await notifyTierChange({member,fromTier:oldMemberTier,toTier:newMemberTier,lifetimePoints:member.lifetimePoints});
 res.json({message:"Referral applied",bonus:BONUS,member:serialize(member)});
});

module.exports=router;
