import dotenv from 'dotenv'
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Partials,
  ChannelType,
} from 'discord.js'
import { Configuration, OpenAIApi } from 'openai'
dotenv.config()

const configuration = new Configuration({
  organization: process.env.OPENAI_ORG_ID,
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

const commands = [
  {
    name: 'ask',
    description: '為什麼不問問神奇海螺?',
    options: [
      {
        name: 'question',
        description: 'Your question',
        type: 3,
        required: true,
      },
    ],
  },
]

async function ask({ user, question }) {
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: question,
    user,
    temperature: 0.7,
    max_tokens: 2048,
    frequency_penalty: 0,
    presence_penalty: 0,
  })
  return response.data
}

async function initDiscordCommands() {
  const rest = new REST({ version: '10' }).setToken(
    process.env.DISCORD_BOT_TOKEN
  )

  try {
    console.log('Started refreshing application (/) commands.')
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
      body: commands,
    })
    console.log('Successfully reloaded application (/) commands.')
  } catch (error) {
    console.error(error)
  }
}

async function main() {
  await initDiscordCommands()

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildIntegrations,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.DirectMessageTyping,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  })

  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
    console.log(new Date())
  })

  // client.on('messageCreate', async (message) => {
  //   console.log(`createMessage: `)
  //   console.log(message)
  // })

  client.on('interactionCreate', async (interaction) => {
    switch (interaction.commandName) {
      case 'ask':
        try {
          await interaction.reply({ content: "loading..." })
          const question = interaction.options.getString('question')
          const answer = await ask({
            user: interaction.user.id,
            question,
          })
          if (!answer?.choices[0]?.text) {
            await interaction.editReply({ content: '抱歉我沒有這個問題的答案...' })
          } else {
            await interaction.editReply({ content: answer.choices[0].text })
          }
        } catch(e) {
          await interaction.editReply({ content: '抱歉我目前不太方便回答你這個問題...' })
        }
        break
    }
  })

  client.login(process.env.DISCORD_BOT_TOKEN)
}

main()
