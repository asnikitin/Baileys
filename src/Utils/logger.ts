import P from 'pino'

export default P({
  transport: {
    target: 'pino-pretty',
    options: {
      singleLine: true
    }
  }
})
