# ssh-cert-app

A companion app built with [Probot](https://github.com/probot/probot) for the gh extension [gh-ssh-cert](https://github.com/helaili/gh-ssh-cert) to generate ssh certifcates for GitHub

## Setup

```sh
# Install dependencies
npm install

# Run the bot
npm start
```

## Docker

```sh
# 1. Build container
docker build -t ssh-cert-app .

# 2. Start container
docker run -e APP_ID=<app-id> -e PRIVATE_KEY=<pem-value> ssh-cert-app
```

## Contributing

If you have suggestions for how ssh-cert-app could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2022 Alain Hélaïli <helaili@github.com>
