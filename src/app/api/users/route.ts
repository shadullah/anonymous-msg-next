import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";

export async function POST(request:Request){
    await dbConnect()
    try {
        const {username, email, password}=await request.json()

        const existingUserVerifiedByUsername = await UserModel.findOne({
            username, isVerified:true 
        })

        if(existingUserVerifiedByUsername){
            return Response.json({
                success:false, message:"username is already taken"
            }, {status:400})
        }

        const existingUserByEmail = await UserModel.findOne({email})

        const verifyCode = Math.floor(10000+Math.random() *90000).toString()

        if(existingUserByEmail){
            if(existingUserByEmail.isVerified){
                return Response.json({
                    success:false,
                    message:"User already exists with this email"
                }, {status:500})
            }
            else{
                const hashedPassword = await bcrypt.hash(password, 10)
                existingUserByEmail.password = hashedPassword
                existingUserByEmail.verifyCode=verifyCode
                existingUserByEmail.verifyCodeExpiry = new Date(Date.now()+3600000)

                await existingUserByEmail.save()
            }
        }
        else{
            const hashedPassword = await bcrypt.hash(password, 10)
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours()+1)

            const newUser = new UserModel({
                username, 
                email,
                password:hashedPassword,
                verifyCode,
                verifyCodeExpiry:expiryDate,
                isVerified:false,
                isAcceptingMessage:true,
                messages:[]
            })

            await newUser.save()
        }

        // send verification email 
        const emailResponse = await sendVerificationEmail(email, username, verifyCode)

        if(!emailResponse.success){
            return Response.json({
                success:false,
                message:emailResponse.message
            }, {status:500})
        }
        
        return Response.json({
            success:true,
            message:"User registered successfully!!"
        }, {status:201})


    } catch (error) {
        console.log('error registering user', error);
        return Response.json({
            success:false,
            message:"error registering user"
        }, {
            status:500
        })
    }
}

export async function GET() {
    await dbConnect();
    try {
        const users = await UserModel.find({}, "-password"); // Exclude passwords for security
        
        return Response.json({
            success: true,
            users
        }, { status: 200 });
    } catch (error) {
        console.error("Error fetching users", error);
        return Response.json({
            success: false,
            message: "Error fetching users"
        }, { status: 500 });
    }
}

