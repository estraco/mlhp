import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs/promises';
import glob from 'glob';
import path from 'path';
import vm from 'vm';
import util from 'util'
import crypto from 'crypto';
import { spawn, exec } from 'child_process'
// @ts-ignore
import flags from 'flags';

const app = express();

const mtags = [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'HEAD',
    'OPTIONS'
];
const ltags = [
    'JS',
    'PY',
    'LUA'
];

const mregex = new RegExp(mtags.map(label => `<mlhp-(${label})>(.*?)</mlhp-${label}>`).join('|'), 'msg')
const lregex = new RegExp(ltags.map(label => `<mlhp-(${label})>(.*?)</mlhp-${label}>`).join('|'), 'msg')

flags.defineInteger('port', 8080, 'Port to listen on');
flags.defineString('dir', './pages', 'Direcotry that has pages in it');

flags.parse();
util.promisify(exec)(process.platform == 'win32' ? 'python3 -m pip install munch' : 'pip3 install munch', {
    cwd: process.platform == 'win32' ? process.env.TEMP : '/tmp/'
}).then(() => {
    console.log('installed munch')
})

let dir = path.join(__dirname, flags.get('dir')).replace(/\/+$/, '') + '/**/**.mlhp';

glob.sync(dir).forEach(async a => {
    a = path.join(a, '.')
    let uri = a.split(path.join(__dirname, flags.get('dir')))[1].split('\\').join('/').split('.mlhp')[0] == '/index' ? '/' : a.split(path.join(__dirname, flags.get('dir')))[1].split('\\').join('/').split('.mlhp')[0]

    let parsed = await parse((await fs.readFile(a)).toString(), uri)

    parsed.forEach((p: [string, string[][], string]) => {
        app[p[0].toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'head' | 'options'](uri, async (req, res, next) => {
            let final = p[2]

            for (let i = 0; i < p[1].length; i++) {
                const type = p[1][i][0]
                const func = type == 'JS' ? new NodeCode(p[1][i][1].trim()) : type == 'PY' ? new PYCode(p[1][i][1]) : new LuaCode(p[1][i][1].trim())
                final = final.replace(p[1][i][2], await func.exec(req, res, next).then((a: any) => {
                    console.log(a);
                    return a
                }))
            }

            res.send(final)
        })
        console.log(p[0], p[1].map(a => a[0]).join(', '))
    })
});

function parse(str: string, uri: string): Promise<any> {
    return new Promise((resolve) => {
        resolve([...str.matchAll(mregex)].map((b: string[]) => b.filter(a => a != undefined)).map((match: any) => {
            let d = [...match[2].matchAll(lregex)].map((b: any[]) => b.filter(a => a != undefined)).map((match: any, ...args: any[]) => {
                return [match[1], match[2], args[1][args[0]][0]]
            })
            return [match[1], d, match[2]]
        }))
    })
};

class PYCode {
    term: any;
    code: string;
    constructor(code: string, timeout: number = 2000) {
        this.term = (...args: any[]) => new Promise(async res => {
            let buffs: Buffer[] = []
            let _path = `${process.platform == 'win32' ? process.env.TEMP : '/tmp'}/${Date.now()}-${crypto.randomBytes(48).toString('hex')}.py`
            await fs.writeFile(_path, `import sys
import json
import os
import time
from munch import DefaultMunch

req = DefaultMunch.fromDict(json.loads(sys.argv[1]))

exec('def run(req):\\n\\t' + sys.argv[2])
print(run(req))
`)
            let proc = spawn('python3', [_path, ...args], { timeout })
            proc.stderr.on('data', (data) => buffs.push(data));
            proc.stdout.on('data', (data) => buffs.push(data));
            proc.on('close', (code) => {
                let str = Buffer.concat(buffs).toString()
                str = str.split('\n').slice(0, str.split('\n').length - 1).join('\n')
                console.log('py exited with code', code);
                res(str);
                fs.rm(_path)
            })
            setTimeout(proc.kill, timeout)
        })
        this.code = code;
    }

    exec(req: Request, res: Response, next: NextFunction) {
        let code = this.code.replace(/\s*\n(?:\r|)/, '')
        let indlength = code.split('\n')[0].match(/(\s*.*)/)![0].length - code.split('\n')[0].trim().length
        code = code.split('\n').map(line => line.substring(indlength)).join('\n\t')
        return this.term(JSON.stringify({
            headers: req.headers,
            body: req.body,
            query: req.query,
            originalUrl: req.originalUrl,
            host: req.hostname,
            protocol: req.protocol,
            ip: req.ip
        }), code)
    }
}

class NodeCode {
    eval: ReturnType<typeof vm.runInNewContext>;
    constructor(code: string, context: {
        [key: string]: any;
    } = {}) {
        console.log(code)
        this.eval = vm.runInNewContext(`async function exec(req, res, next) {
    ${code};
    return '';
}
exec;`, {
            require,
            ...context
        })
    }

    exec(req: Request, res: Response, next: NextFunction) {
        return this.eval(req, res, next).catch((a: Error) => a)
    }
}

class LuaCode {
    term: any;
    code: string;
    constructor(code: string, timeout: number = 2000) {
        this.term = (...args: any[]) => new Promise(async res => {
            let buffs: Buffer[] = []
            let _path = `${process.platform == 'win32' ? process.env.TEMP : '/tmp'}/${Date.now()}-${crypto.randomBytes(48).toString('hex')}.lua`
            await fs.writeFile(_path, `${await fs.readFile(path.join(__dirname, '../_min.lua'), 'utf8')};local req=json.decode(dec('${Buffer.from(args[0]).toString('base64')}'))
print((function()${code};end)())`)
            console.log(await fs.readFile(_path, 'utf8'))
            let proc = spawn('lua', [_path], { timeout })
            proc.stderr.on('data', (data) => buffs.push(data));
            proc.stdout.on('data', (data) => buffs.push(data));
            proc.on('close', (code) => {
                let str = Buffer.concat(buffs).toString()
                str = str.split('\n').slice(0, str.split('\n').length - 1).join('\n')
                console.log('lua exited with code', code);
                res(str);
                fs.rm(_path)
            })
            setTimeout(proc.kill, timeout)
        })
        this.code = code;
    }

    exec(req: Request, res: Response, next: NextFunction) {
        let code = this.code.replace(/\s*\n(?:\r|)/, '')
        let indlength = code.split('\n')[0].match(/(\s*.*)/)![0].length - code.split('\n')[0].trim().length
        code = code.split('\n').map(line => line.substring(indlength)).join('\n\t')
        return this.term(JSON.stringify({
            headers: req.headers,
            body: req.body,
            query: req.query,
            originalUrl: req.originalUrl,
            host: req.hostname,
            protocol: req.protocol,
            ip: req.ip
        }))
    }
}

app.listen(flags.get('port'), () => {
    console.log('Listening on port', flags.get('port'), 'with pid', process.pid);
})