const express=require("express");
const mongoose=require("mongoose");
const Member=require("../models/Member");
const PointLot=require("../models/PointLot");
const Transaction=require("../models/Transaction");
const router=express.Router();

router.post("/clock",async(req,res)=>{
 const now=req.body?.now?new Date(req.body.now):new Date();
 if(Number.isNaN(now.getTime()))return res.status(400).json({error:"now must be a valid ISO date"});
 const session=await mongoose.startSession();let expiredPoints=0,affectedMembers=0,entries=[];
 try{await session.withTransaction(async()=>{
   const lots=await PointLot.find({remaining:{$gt:0},expiresAt:{$lte:now}}).session(session).sort({expiresAt:1});
   const byMember=new Map();
   for(const lot of lots){lot.expiredAt=now;lot.remaining=0;await lot.save({session});const key=String(lot.member);byMember.set(key,(byMember.get(key)||0)+lot.points);}
   for(const [memberId,points] of byMember){
     const m=await Member.findById(memberId).session(session);if(!m)continue;
     const expired=Math.min(points,m.currentBalance);if(expired<=0)continue;
     const updated=await Member.findByIdAndUpdate(m._id,{$inc:{currentBalance:-expired}},{new:true,session});
     await Transaction.create([{member:m._id,type:"expiry",pointsSpent:expired,balanceAfter:updated.currentBalance}],{session});
     expiredPoints+=expired;affectedMembers++;entries.push({memberId:String(m._id),pointsExpired:expired,balanceAfter:updated.currentBalance});
   }
 });res.json({ok:true,now:now.toISOString(),expiredPoints,affectedMembers,entries});}
 catch(e){res.status(500).json({error:e.message||"Clock processing failed"});}finally{await session.endSession();}
});
module.exports=router;
