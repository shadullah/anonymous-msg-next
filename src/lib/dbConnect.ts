import mongoose from "mongoose";

type ConnectObject= {
    isConnected?: number 
}

const connection:ConnectObject= {}

async function dbConnect():Promise<void> {
    if(connection.isConnected){
        console.log("already connected to database");
        return 
    }

    try{
        const db = await mongoose.connect(process.env.MONGODB_URI || '', {})
        // console.log(db);
        // console.log(db.connections);

        connection.isConnected= db.connections[0].readyState

        console.log("DB connected successfully!!");
    }
    catch(error){
        console.log("database connection failed ", error);
        process.exit()
    }
}

export default dbConnect;