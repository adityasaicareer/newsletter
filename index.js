import {createClient} from "@supabase/supabase-js";
import OpenAI from "openai";
import nodemailer from "nodemailer"
import cron from "node-cron";
import 'dotenv/config';


const supabase=createClient(process.env.SUPABASE_URL, process.env.SUPABASE_API)

const openai=new OpenAI({apiKey:process.env.OPENAI})

const transporter=nodemailer.createTransport({
    service:"gmail",
    auth:{
         user:"adityasaivit@gmail.com",
         pass:"vpru vzqg nsrk lgni"
    }
   
})
async function getmails()
{
    const now=new Date().toISOString();
    const {data,error}=await supabase.from("users").select("email").lt("next_send_at",now)
    const arr=data.map((i)=>i.email)
    return arr
}



async function sendnewsletters()
{
    const emails=await getmails();
    console.log(emails)
    for(let i=0;i<emails.length;i++)
    {
        const email=emails[i];
        const {data,err1}=await supabase.from("users").select("topics").eq("email",email);
        let topics=data.topics;
        const prompt = `
            You are an experienced, friendly newsletter writer. Produce a complete HTML newsletter (self-contained snippet)
            for a reader interested in: ${topics}.

            Constraints:
            - Return ONLY valid HTML markup (a single root <div> or complete <html> block). No extra commentary.
            - Include: title/hero, 3 article blocks (each: title, 2–3 sentence summary, one key-takeaway bullet, "Read more" link), "Further reading" links, and footer with unsubscribe text.
            - Use inline CSS (mobile-first), no external images or scripts.
            - Keep length suitable for an email newsletter (~300–700 words).
            - Use placeholder links , they should be real links
            - Do NOT include <script> tags.
            - make a really pleasing styling
            - the newsletter should look good

            Produce final HTML only.
            `;

        const completion=await openai.chat.completions.create({
            model:"gpt-4o-mini",
            messages:[
                {role:"system",content:"You generate clean HTML email newsletter"},
                {role:"user",content:prompt}
            ],
            temperature:0.2,
            max_tokens:2000

        });
        const htmlcontent = completion.choices?.[0]?.message?.content?.trim();

        transporter.sendMail({
            from:"adityasaivit@gmail.com",
            to:email,
            subject:"News Letter",
            html:htmlcontent
        })
        const {data:data1,error}=await supabase.from("users").select("frequency").eq("email",email);
        console.log(data1)
        const freq=data1.frequency
        let step=0;
        if(freq=="Daily")
        {
            step=1;
        }
        else if(freq=="Weekly")
        {
            step=7;
        }
        else if(freq=="Monthly")
        {
            step=30;
        }
        else{
            step=120;
        }
        const now1=new Date().toISOString();
        const nextdate=new Date(Date.now()+step*24*60*60*1000).toISOString
        const {data:data2,err}=await supabase.from("users").update({"last_sent_at":now1,"next_send_at":nextdate}).eq("email",i);
        console.log(data2)

    }
}

cron.schedule("* * * * * ",()=>{
    sendnewsletters();
})


