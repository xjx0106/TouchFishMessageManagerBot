# TouchFishMessageManagerBot

### A telegram bot that automatically manages message queues and sends messages.



if developing in local environment, set the proxy as follows.

```
  // part
  request: {
    proxy: "http://xxx.xxx.xxx.xxx:xxxx/",
  }
```

```
  // full in index.js
  module.exports = new TelegramBot(TELEGRAM_BOT_TOKEN, {
    polling: true,
    request: {
      proxy: "http://xxx.xxx.xxx.xxx:xxxx/",
    }
});
```
