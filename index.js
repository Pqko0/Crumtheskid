const development = true;

const mongoose = require("mongoose")

mongoose.connect("", {
    dbName: "development"
})

const users = mongoose.model("users", mongoose.Schema({
    user: {
        unique: true,
        type: String,
        required: true
    },
    userID: {
        unique: true,
        type: String,
        default: () => require("randomstring").generate({
            length: 4,
            charset: "1234567890"
        })
    },
    secretCode: {
        unique: true,
        type: String,
        default: () => require("randomstring").generate({
            length: 40
        })
    }
}))

const images = mongoose.model("images", mongoose.Schema({
    User: String,
    ImageID: {
        type: String,
        default: () => require("randomstring").generate({
            length: 10
        })
    },
    ImagePath: String
}))

const domains = mongoose.model("domains", mongoose.Schema({
    domainID: {
        type: String,
        unique: true,
        default: () => require("randomstring").generate({
            length: 30
        })
    },
    domain: {
        type: String,
        unique: true,
        required: true
    },
    domainOwner: String
}))

const express = require("express")
const app = express()

app.listen(5005)

app.use(express.urlencoded({extended:false}))
app.use(express.json())
app.use(require("express-fileupload")())

app.use((req, res, next) => {
    res.header("x-powered-by", "DarkWayHosting-Pqko")
    next()
})

app.use(async (req, res, next) => {
    if(req.protocol !== "HTTPS" && development == false) return res.redirect(`https://${req.hostname}${req.originalUrl}`)

    if(req.hostname.toLowerCase() !== "crumtheskid.xyz") {
        const d = await domains.findOne({ domain: req.hostname.toLowerCase() })

        if(!d) return res.send("This domain name is not registered.\nIf you wish you site to be added to CTS.XYZ please dm Pqko#0117")
    }
    
    next();
})

app.get("/", (req, res) => {
    res.redirect("https://discord.gg/TnW2GTNuU2")
})

app.post("/api", async (req, res) => {
    if(req.hostname.toLowerCase() !== "crumtheskid.xyz" && development == false) return res.send("https://crumtheskid.xyz/api is the only accepted endpoint!")

    if(!req.body.code) return res.send("Missing authentication!")

    const u = await users.findOne({ secretCode: req.body.code })

    if(!u) return res.send("Invalid authencation!")

    if(!req.files.sharex) return res.send("Missing sharex attribute!")

    const sharex = req.files.sharex;

    const fileName = String(sharex.name).toLowerCase();
    let endingPath = null

    if(fileName.endsWith(".png")) endingPath = ".png"
    if(fileName.endsWith(".jpg")) endingPath = ".jpg"
    if(fileName.endsWith(".jpeg")) endingPath = ".jpeg"
    if(fileName.endsWith(".gif")) endingPath = ".gif"

    if( endingPath == null ) return res.send("Unsupported type! Only .png, .jpg, .jpeg, .gif")

    const end = require("randomstring").generate({
        length: 10
    })

    const filePath = require("path").join(__dirname, "/uploads/", end + endingPath)

    const filePathNoCurrentDir = require("path").join("uploads", end + endingPath);

    new images({
        User: u.user,
        ImagePath: filePathNoCurrentDir
    }).save().then((x) => {
        sharex.mv(filePath);
        return res.send(`${req.body.preferDomain ? `https://${req.body.preferDomain}` : "https://crumtheskid.xyz"}/${u.userID}/${x.ImageID}`);
    }).catch((x) => {
        return res.send("Failed to save image to database.")
    });

})

app.get("/:user/:imageid", async (req, res) => {
    const u = await users.findOne({ userID: req.params.user })

    if(!u) return res.send("Unknown user!")

    const i = await images.findOne({ ImageID: req.params.imageid })

    if(!i) return res.send("Unknown image id by user!")
    
    const imageLink = `https://crumtheskid.xyz/${req.params.user}/${req.params.imageid}/${i.ImagePath.endsWith(".gif") ? "image.gif" : "image" }`
    
    res.send(`<!DOCTYPE html>
    <html>
        <head>
            <meta property="og:title" content="${req.hostname.toLowerCase() == "crumtheskid.xyz" ? "CrumTheSkid.XYZ" : `${req.hostname}`}"/>
            <meta property="og:url" content="https://crumtheskid.xyz/" />
            <meta property="og:image" content="${imageLink}" />
            <meta name="twitter:card" content="summary_large_image">
            <link type="application/json+oembed" href="https://crumtheskid.xyz/oembed" />
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300&display=swap" rel="stylesheet">
            <style>
            body {
                max-width: 100%;
                max-height: 100%;
                background-color: black;
                text-align: center;
    
            }
    
            h5 {
                font-family: 'Poppins', sans-serif;
                color: white;
                font-size: 30px;
            }
    
            img {
                width: 100%;
                height: 100%;
                max-height: 90vh;
                max-width: 90vh;
            }
            </style>
        </head>
        <body>
            <h5>Powered by Pqko#0117</h5>
            ${String(imageLink).endsWith("image") ? `<img src="${imageLink}"></img>`: String(imageLink).endsWith(".gif") ? `<img src="${imageLink}"></img>` : `<h5>500 - Internal Error!</h5>`}
        </body>
    </html>`)
})

app.get("/:user/:imageid/image", async (req, res) => {
    const u = await users.findOne({ userID: req.params.user })

    if(!u) return res.send("Unknown user!")

    const i = await images.findOne({ ImageID: req.params.imageid })

    if(!i) return res.send("Unknown image id by user!")

    if(i.ImagePath.endsWith(".gif") || i.ImagePath.endsWith(".mp4")) return

    res.sendFile(__dirname + `/${i.ImagePath}`)
})

app.get("/:user/:imageid/image.gif", async (req, res) => {
    const u = await users.findOne({ userID: req.params.user })

    if(!u) return res.send("Unknown user!")

    const i = await images.findOne({ ImageID: req.params.imageid })

    if(!i) return res.send("Unknown image id by user!")

    res.sendFile(__dirname + `/${i.ImagePath}`)
})

app.get("/oembed", (req, res) => {
    // let oembed = {};

    return res.send(JSON.stringify({
        provider_name: "Crum, this service is free. Use it.",
        provider_url: "https://crumtheskid.xyz/"
    }))
})

const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, Embed } = require("discord.js")
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
})

const pqko = require("pqko-discord")
const sc = new pqko.SlashCommands("MTA4NDkxODc5NTU2ODY4NTIwOA.GjOLzA.cuPDod3W-HZ7OVXa8kQZn4XhafT99iUAgYlrLM", "1084918795568685208", "sle8X_uOMGEXEpo_Fmz-m5niWKQfGnc6", client);

sc.jsonHandler([
    {
        data: new SlashCommandBuilder().setName("create").setDescription("Creates account on our platform!").setDMPermission(false),
        /**
         * 
         * @param {ChatInputCommandInteraction} interaction 
         * @returns 
         */
        execute: async (interaction) => {
            const user = await users.findOne({ user: interaction.member.id }) 

            if(user) return interaction.reply({ embeds: [ new EmbedBuilder().setTitle("You already have an account!").setColor("Red") ], ephemeral: true })

            new users({
                user: interaction.member.id
            }).save().then((x) => {
                interaction.reply({ embeds: [ new EmbedBuilder().setTitle(`Account created!\nCopy the following and import it via ShareX in the Custom Uploader Settings.`).setColor("Green") ], content: `\`\`\`\{"Version": "15.0.0","Name": "CrumTheSkid","DestinationType": "ImageUploader","RequestMethod": "POST","RequestURL": "https://crumtheskid.xyz/api","Body": "MultipartFormData","Arguments": {"code": "${x.secretCode}"},"FileFormName": "sharex"}\`\`\``, ephemeral: true })
            }).catch((x) => {
                interaction.reply({ embeds: [ new EmbedBuilder().setColor("Red").setTitle("Failed to save to database! Please contact Pqko#0117") ], ephemeral: true})
            });
        }
    },
    {
        data: new SlashCommandBuilder().setName("export").setDescription("Get your ShareX Credentials").setDMPermission(false),
        /**
         * 
         * @param {ChatInputCommandInteraction} interaction 
         * @returns 
         */
        execute: async (interaction) => {
            const usr = await users.findOne();

            if(!usr) return interaction.reply({ embeds: [ new EmbedBuilder().setTitle("You do not have an account!\nPlease type /create!").setColor("Red") ], ephemeral: true })

            return interaction.reply({ embeds: [ new EmbedBuilder().setTitle(`Account exported!\nCopy the following and import it via ShareX in the Custom Uploader Settings.`).setColor("Green") ], content: `\`\`\`\{"Version": "15.0.0","Name": "CrumTheSkid","DestinationType": "ImageUploader","RequestMethod": "POST","RequestURL": "https://crumtheskid.xyz/api","Body": "MultipartFormData","Arguments": {"code": "${usr.secretCode}"},"FileFormName": "sharex"}\`\`\``, ephemeral: true })
        }
    },
    {
        data: new SlashCommandBuilder().setName("owner").setDescription("Owner only commands").setDMPermission(false)
        .addSubcommand((x) => x.setName("add-domain").setDescription("Adds domain to CTS.XYZ").addStringOption((x) => x.setName("domain-name").setDescription("Domain name").setRequired(true)))
        .addSubcommand((x) => x.setName("remove-domain").setDescription("Removes domain to CTS.XYZ").addStringOption((x) => x.setName("domain-name").setDescription("Domain name").setRequired(true))),
        /**
         * 
         * @param {ChatInputCommandInteraction} interaction 
         */
        execute: (interaction) => {
            if(interaction.member.id !== client.application.owner.id) return interaction.reply({ embeds: [new EmbedBuilder().setTitle("You do not have permission for this command!").setColor("Red324")] })
            
            const subCommand = interaction.options.getSubcommand();

            switch (subCommand) {
                case "add-domain": {

                }

                case "remove-domain": {
                    
                }
            }
        }
    }
]);

sc.login()


client.on("shardError", (x) => {
    return console.log(x);
  });
client.on("error", (x) => {
return console.log(x);
});
process.on("unhandledRejection", (x) => {
return console.log(x);
});
process.on("uncaughtException", (x) => {
return console.log(x);
});
