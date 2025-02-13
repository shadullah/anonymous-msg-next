import dbConnect from "@/lib/dbConnect";
import { headers } from "next/headers";
import { Webhook } from "svix";
import path from 'path';
import fs from 'fs/promises';

interface WebhookEvent {
    data: {
        id: string;
        email_addresses: string[];
        username: string;
        first_name: string;
        last_name: string;
    };
    object: string;
    type: string;
}

interface StoredData {
    eventType: string;
    data: {
        id: string;
        email_addresses: string[];
        username: string;
        first_name: string;
        last_name: string;
    };
    timestamp: string;
}

export async function POST(request: Request) {
    await dbConnect();

    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
        throw new Error("Please add webhook secret in the .env file");
    }

    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_signature || !svix_timestamp) {
        return new Response("Error occurred - no svix headers found", { status: 400 });
    }

    const payload = await request.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(webhookSecret);

    let evt: WebhookEvent;
    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-signature": svix_signature,
            "svix-timestamp": svix_timestamp,
        }) as WebhookEvent;
    } catch (error) {
        console.error('Webhook processing error', error);
        return Response.json({
            success: false,
            message: "Webhook couldn't be processed"
        }, { status: 400 });
    }

    const { id } = evt.data;
    const eventType = evt.type;

    if (eventType === "user.created") {
        try {
            const dataToStore: StoredData = {
                eventType: evt.type,
                data: evt.data,
                timestamp: new Date().toISOString()
            };

            const dbPath = path.join(process.cwd(), 'db.json');

            try {
                await fs.access(dbPath);
            } catch (error) {
                await fs.writeFile(dbPath, JSON.stringify([], null, 2));
                console.log("db.json file created successfully",error);
            }

            let existingData: StoredData[] = [];
            try {
                const fileContent = await fs.readFile(dbPath, 'utf-8');
                existingData = JSON.parse(fileContent);
            } catch (error) {
                console.error("Error reading db.json file", error);
                return Response.json({
                    success: false,
                    message: "Error reading db.json file"
                }, { status: 500 });
            }

            existingData.push(dataToStore);
            await fs.writeFile(dbPath, JSON.stringify(existingData, null, 2));

            console.log("Data stored successfully");
            return Response.json({
                success: true,
                message: "User created and data stored"
            }, { status: 200 });
        } catch (error) {
            console.error("Error in Clerk", error);
            return Response.json({
                success: false,
                message: "Error in Clerk"
            }, { status: 500 });
        }
    }

    console.log(id);

    return Response.json({
        success: true,
        message: "Received"
    });
}