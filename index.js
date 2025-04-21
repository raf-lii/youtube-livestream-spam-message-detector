import dotenv from 'dotenv';
dotenv.config();
import inquirer from 'inquirer';
import chalk from 'chalk';
import { google } from 'googleapis';
import http from 'http';
import fs from 'fs';
import open from 'open';
import path from 'path';

const oAuth2Client = new google.auth.OAuth2(process.env.PROJECT_ID, process.env.SECRET_KEY, "http://localhost:8080");

//setup server to get callback from google
const setupServer = async () => {
    const server = http.createServer(async (req, res) => {
        try {

            const url = new URL(req.url, 'http://localhost:8080');
            const code = url.searchParams.get('code');
            const { tokens } = await oAuth2Client.getToken(code);
    
            fs.writeFileSync('token.json', JSON.stringify(tokens));
    
            res.end("Authentication success, you can close this window");
            server.close();

        } catch (e) {

            new Error("❌ Failed to authenticate, please try again");
            res.end("Authentication failed");

        }
    });

    server.listen(8080);
};

const waitForFile = () => {
    return new Promise((resolve, reject) => {
        const dir = path.dirname("./token.json");

        //detecting token.json file
        const watcher = fs.watch(dir, (eventType, name) => {
            if(name == "token.json"){
                console.log(chalk.green('✅ Authentication Success'));
                watcher.close();
                resolve();
            }
        });
    
        //if in 15 sec file token.json didn't show up, it will trigger error and stop the process
        setTimeout(() => {
            watcher.close();
            reject(new Error("⏰ Timeout: File not found in 15 seconds, please run again"));
        }, 15000);
    });
}

const isBlockedWord = (comment) => {
    const message = comment.normalize("NFKD");

    if(comment !== message){
        return true;
    }

    const blockedWords = JSON.parse(fs.readFileSync("blockedword.json"));

    const lowerText = comment.toLowerCase();

    return blockedWords.some(word => lowerText.includes(word.toLowerCase()));
}

const getLiveChatId = async (auth, liveStreamId) => {
    const broadcast = await google.youtube({version: "v3", auth}).videos.list({
        part: "liveStreamingDetails",
        id: `${liveStreamId}`
    });

    const liveChatId = broadcast.data.items[0].liveStreamingDetails.activeLiveChatId;

    return liveChatId;
}

const getLiveStreamComments = async (auth, liveChatId) => {
    const fetchComments = await google.youtube({version: "v3", auth}).liveChatMessages.list({
        part: "id,snippet",
        liveChatId: liveChatId
    });

    return fetchComments;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    try{

        //if token.json files didn't exist it will be generate auth url for user to authenticate & get token
        if(!fs.existsSync("./token.json")){
            setupServer();
        
            const authUrl = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: ["https://www.googleapis.com/auth/youtube.force-ssl"]
            });
        
            console.log(chalk.blue('🌐 Opening browser for authentication...'));
        
            open(authUrl);
        
            await waitForFile();
        }

        //set credential from token.json file
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync("./token.json")));

        const liveStreamId = await inquirer.prompt({
            input:"input", 
            name: "id",
            message: " 📽️  Livestream ID :"
        });

        console.log(chalk.green('💱 Live chat monitoring started, watching comments...'));

        const liveChatId = await getLiveChatId(oAuth2Client, liveStreamId.id);

        while(true){
            const comments = await getLiveStreamComments(oAuth2Client, liveChatId);

            const pollingInterval = process.env.DELAY ?? comments.data.pollingIntervalMillis;

            //loop any comment and check if the comment contains blocked word or not
            const newComments = comments.data.items;

            for(const comment of newComments){
                const commentText = comment.snippet.displayMessage;
                const person = comment.snippet.authorChannelId;
                const idComment = comment.id;
    
                if(isBlockedWord(commentText)){
                    console.log(chalk.red(`❗ Blocked word detected! (${person}): ${commentText} deleted`));
    
                    //deleting comment
                    const deleteComment = await google.youtube({version: "v3", auth: oAuth2Client}).liveChatMessages.delete({
                        id: idComment
                    });
                }
            }

            console.log(chalk.blue(`↩️ Waiting to fetch new comments ${pollingInterval}ms...`));
            await delay(pollingInterval);
        }
        
    }catch(e){
        console.error(chalk.red(`⚠️ Error: ${e.message}`));
    }
})();
