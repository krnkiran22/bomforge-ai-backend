class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  info(message: string, ...args: any[]) {
    console.log(`[${this.getTimestamp()}] INFO:`, message, ...args);
  }

  error(message: string, error?: any) {
    console.error(`[${this.getTimestamp()}] ERROR:`, message);
    if (error) {
      if (error.stack) {
        console.error(error.stack);
      } else {
        console.error(error);
      }
    }
  }

  warn(message: string, ...args: any[]) {
    console.warn(`[${this.getTimestamp()}] WARN:`, message, ...args);
  }

  debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.getTimestamp()}] DEBUG:`, message, ...args);
    }
  }
}

export default new Logger();
