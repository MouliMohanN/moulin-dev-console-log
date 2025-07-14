//      let doc: any = {
export const logger = {
  log: (message: string, optionalParams: any) => {
    // You can replace this with any logging mechanism you prefer
    console.log(message, JSON.stringify(optionalParams));
  },
};
