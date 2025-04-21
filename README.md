# Youtube Livestream Spam Message Detector

This project can make it easier for you to monitor live streams so you don't need to monitor them continuously manually.

> [Notes]
> Before running this project, please make sure u have [NodeJS](https://nodejs.org) & [npmJS][https://npmjs.com] installed in ur own end

## Installation
```
npm install
```

## Configuration
- Create new file with `.env` name
- Then copy all of the think in `.env.example` file
- Fill it with ur credential from [Google console](https://console.cloud.google.com/)
- Run it with `node index` command
- After that a browser will be popup and require u to authenticate. Make sure login with google account that is going to use to live stream
- Input ur livestream ID, example `https://www.youtube.com/watch?v=wQl5UcbCtbo`. Then u can fill it with `wQl5UcbCtbo`

## Important
- This youtube Data API V3 is have 10.000 quota unit / day. So when it already reach the limit, u can't run this script again and had to wait until tomorrow.
- This project is inspired by [JudolSlayerProject](https://github.com/MBenedictt/JudolSlayerProject)
