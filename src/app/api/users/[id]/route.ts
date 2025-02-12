import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";
import mongoose from "mongoose";


export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    await dbConnect();
    try {
        const userId = params.id;
        
        const user = await UserModel.findById(
            new mongoose.Types.ObjectId(userId), 
            "-password"
        );
        
        if (!user) {
            return Response.json({
                success: false,
                message: "User not found"
            }, { status: 404 });
        }
        
        return Response.json({
            success: true,
            user
        }, { status: 200 });
    } catch (error) {
        console.error("Error fetching user", error);
        return Response.json({
            success: false,
            message: "Error fetching user"
        }, { status: 500 });
    }
}