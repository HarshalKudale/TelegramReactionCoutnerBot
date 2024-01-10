const { Telegraf } = require('telegraf');
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config();// replace with your actual connection string
let db;
let collection;

async function connectToMongoDB() {
  console.log('Connected to MongoDB');
  if (db && collection) {
    return; // Already connected, no need to reconnect
  }

  // Replace 'your_mongodb_connection_string' with your actual connection string
  const client = new MongoClient(process.env.DATABASE, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db('messages'); // replace with your actual database name
    collection = db.collection('message'); // replace with your actual collection name
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    throw err;
  }
}
function closeMongoDB() {
  if (db) {
    db = undefined;
    collection = undefined;
    client.close();
    console.log('Connection to MongoDB closed');
  }
}
function getDB() {
  if (!db) {
    throw new Error('Database is not connected. Call connectToMongoDB first.');
  }
  return db;
}

function getCollection() {
  if (!collection) {
    throw new Error('Collection is not set. Call connectToMongoDB first.');
  }
  return collection;
}
// Replace 'YOUR_BOT_TOKEN' with your actual bot token
const bot = new Telegraf(process.env.BOT_TOKEN);

const reactionData = []
async function updateMessage(messageId, newCount) {
  let filter = { messageId: messageId }
  const update = { $inc: { count: newCount } };
  try {
    const result = getCollection().updateOne(filter, update);
  } catch (err) {
    console.error('Error updating document:', err);
  }
}
function createMessage(id, messageId, newCount) {
  getCollection().insertOne({ id, messageId, count: newCount }, (err, result) => {
    if (err) {
      console.error('Error inserting document:', err);
      return;
    }
    else {
      console.log("created")
    }
  });
  reactionData.push({ id, messageId, count: newCount });
}
bot.use((ctx, next) => {
  return next();
});
bot.on('message_reaction', (ctx) => {
  if (ctx.update.message_reaction.chat.id == process.env.CHAT_ID) {
    old_reaction = ctx.update.message_reaction.old_reaction.length
    new_reaction = ctx.update.message_reaction.new_reaction.length
    messageId = ctx.update.message_reaction.message_id
    reaction_count = new_reaction - old_reaction
    updateMessage(messageId, reaction_count)
  }
});
bot.on('animation', (ctx) => {
  // Handle when someone sends an animated GIF
  if (ctx.update.message.chat.id == process.env.CHAT_ID && ctx.update.message.message_thread_id == TOPIC_ID) {
    createMessage(ctx.update.message.from.id, ctx.message.message_id, 0)
  }
});
bot.on('photo', (ctx) => {
  // Handle when someone sends an animated GIF
  if (ctx.update.message.chat.id == process.env.CHAT_ID && ctx.update.message.message_thread_id == process.env.TOPIC_ID) {
    createMessage(ctx.update.message.from.id, ctx.message.message_id, 0)
  }
});
bot.command('count_reacts', async (ctx) => {
  const highestCountDoc = await getCollection().find({}, { sort: { count: -1 }, limit: 10 }).toArray();
  messageWithHighestCount = reactionData.reduce((max, current) => (current.count > max.count ? current : max), reactionData[0]);
  let resultString = 'Contest Top List: \n\n';
  for (let i = 0; i < highestCountDoc.length; i++) {
    resultString += `${highestCountDoc[i].count} --> https://t.me/c/${2139608477}/${process.env.TOPIC_ID}/${highestCountDoc[i].messageId}\n\n`;
  }
  // ctx.reply(`Contest Top List: \n\n${highestCountDoc[0].count} --> ${topMessage}\n\n${highestCountDoc[1].count} --> ${secondMessage}\n\n${highestCountDoc[2].count} --> ${thirdMessage}`);
  ctx.reply(resultString);
});
// Start the bot
connectToMongoDB();
exports.handler = async event => {
  try {
    await bot.handleUpdate(JSON.parse(event.body))
    return { statusCode: 200, body: "" }
  } catch (e) {
    console.error("error in handler:", e)
    return { statusCode: 400, body: "This endpoint is meant for bot and telegram communication" }
  }
}