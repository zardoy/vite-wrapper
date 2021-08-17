import { defineVitConfig } from '../../build'

export default defineVitConfig({
    plugins: [
        {
            name: 'hello-request',
            configureServer(server) {
                server.middlewares.use((req, _res, next) => {
                    console.log('Hello', req.url)
                    next()
                })
            },
        },
    ],
})
