import mongoose from 'mongoose';
const schema=new mongoose.Schema({provider:{type:String,enum:['STRIPE','PAYPAL','RAZORPAY','CASHFREE'],unique:true,required:true},enabled:{type:Boolean,default:false},hasCredentials:{type:Boolean,default:false},supportedMethods:[{type:String}],secretCiphertext:{type:String,select:false},secretIv:{type:String,select:false},secretTag:{type:String,select:false},endpoint:{type:String,default:''}},{timestamps:true});
export default mongoose.model('PaymentGateway',schema);
