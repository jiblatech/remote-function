const http = require('http');
const { RPCError } = require('./errors.js');

const defaultOptions = {
    host: '0.0.0.0',
    port: 6356,
    includeStack: true,
};

class Server {
    constructor(userOptions) {
        this.options = { ...defaultOptions, ...(userOptions || {}) };

        this.server = http.createServer(this.handleRequest.bind(this));
        this.server.listen(this.options.port, this.options.host);
        this.handlers = {};
    }

    handleRequest(req, res) {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
        });
        req.on('end', () => {
            req.body = body;
            this.completeRequest(req)
                .then(result => {
                    // If notification, don't return anything
                    if (result === null) {
                        res.end();
                    }
                    res.end(JSON.stringify({ jsonrpc: '2.0', result: result.result, id: result.id }));
                })
                .catch(error => {
                    res.end(
                        JSON.stringify({
                            jsonrpc: '2.0',
                            error: { code: error.id || -32000, message: error.message },
                            id: req.body.id ? req.body.id : null,
                        })
                    );
                });
        });
    }

    completeRequest(req) {
        try {
            return Promise.resolve(this.finishRequest(req));
        } catch (e) {
            return Promise.reject(e);
        }
    }

    finishRequest(req) {
        try {
            req.body = JSON.parse(req.body);
        } catch (e) {
            throw new RPCError(-32700, 'Parse error');
        }

        if (!validateRequest(req.body)) {
            throw new RPCError(-32600, 'Invalid Request');
        }

        return this.handleRPCObject(req.body);
    }

    handleRPCObject(rpcObject) {
        const functionName = rpcObject.method;
        const id = rpcObject.id;
        const handler = this.handlers[functionName];
        if (typeof handler !== 'function') {
            throw new RPCError(-32601, 'Method not found');
        }

        // Notification
        if (typeof id !== 'number') {
            this.callHandler(handler, rpcObject.params).catch(() => {});
            return Promise.resolve(null);
        }

        return this.callHandler(handler, rpcObject.params).then(result => ({ id, result }));
    }

    callHandler(handler, params) {
        if (!Array.isArray(params)) {
            params = [params];
        }

        try {
            let handlerResult = handler(...params);
            return Promise.resolve(handlerResult);
        } catch (e) {
            return Promise.reject(e);
        }
    }

    errorToObject(error) {
        let object = {};
        Object.getOwnPropertyNames(error).forEach(property => {
            if (property === 'stack' && !this.options.includeStack) {
                return;
            }

            object[property] = error[property];
        });
        return object;
    }

    regsiterHandler(name, handler) {
        this.handlers[name] = handler;
    }
}

function validateRequest(data) {
    return typeof data.method === 'string' && data.jsonrpc === '2.0' && typeof data.params === 'object';
}

const handler = {
    set: function(server, name, handler) {
        server.regsiterHandler(name, handler);
    },

    get: function(server, name) {
        if (name == 'close') {
            return server.server.close.bind(server.server);
        }
    },
};

function createServer() {
    const server = new Server();
    return new Proxy(server, handler);
}

module.exports.createServer = createServer;
