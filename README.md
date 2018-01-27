# Transparent Remote Procedure Call

TRPC is a library for making remote procedure calls in an intuitive way. It has no dependencies and works over http.

## Examples

#### Server

Initiate a server, then just define your function on the server object.

```javascript
const trcp = require('./index.js');
const server = trcp.createServer();

server.divide = (arg1, arg2) => {
    if (arg2 === 0) {
        throw new Error("Can't divide by zero.");
    }
    return arg1 / arg2;
};
```

#### Client

Define where the server is located when creating a client. Then you can just call the function that is defined at the server and you get a promise that returns what the server function will return.

```javascript
const trcp = require('./index.js');
const remote = trcp.createClient({ host: '127.0.0.1' });

remote
    .divide(12, 3)
    .then(console.log)
    .catch(console.log);
```

If you are on _>=Node 8.0.0_, you can use the call with `await` if you are within a `async` function.

```javascript
try {
    let result = await remote.divide(12, 0);
    console.log(result);
} catch (error) {
    console.log(error);
}
```

## Options

#### Server

| Option         | Default     | Description                                  |
| -------------- | ----------- | -------------------------------------------- |
| `host`         | `"0.0.0.0"` | The host that the server listen on           |
| `port`         | `6356`      | The port that the server listen on           |
| `includeStack` | `true`      | Should errors include the server stacktrace? |

#### Client

| Option | Default     | Description                        |
| ------ | ----------- | ---------------------------------- |
| `host` | `"0.0.0.0"` | The host that the server listen on |
| `port` | `1337`      | The port that the server listen on |