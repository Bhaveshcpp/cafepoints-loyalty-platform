const express=require("express");const OutboxEvent=require("../models/OutboxEvent");const router=express.Router();
router.get("/outbox",async(req,res)=>{const status=req.query.status||"pending";const filter=status==="all"?{}:{status};res.json(await OutboxEvent.find(filter).sort({createdAt:1}).limit(100));});
router.post("/outbox/:id/ack",async(req,res)=>{const e=await OutboxEvent.findByIdAndUpdate(req.params.id,{status:"sent",sentAt:new Date()},{new:true});if(!e)return res.status(404).json({error:"Outbox event not found"});res.json(e);});
module.exports=router;
