const mongoose = require("mongoose");
const qrCodeSchema = new mongoose.Schema({
  token:{type:String,required:true,unique:true,index:true},
  type:{type:String,enum:["redemption","earn"],required:true},
  member:{type:mongoose.Schema.Types.ObjectId,ref:"Member",required:true},
  reward:{type:mongoose.Schema.Types.ObjectId,ref:"Reward",default:null},
  points:{type:Number,default:0},
  expiresAt:{type:Date,required:true},
  used:{type:Boolean,default:false},
},{timestamps:true});
qrCodeSchema.index({expiresAt:1},{expireAfterSeconds:0});
module.exports=mongoose.model("QrCode",qrCodeSchema);
