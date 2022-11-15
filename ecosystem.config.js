module.exports = {
    apps: [
        {
            name: 'Teasquare Trading Bot',
            script: 'tsc && node dist/index.js',
            watch: true,
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
            },
        },
    ],
}
