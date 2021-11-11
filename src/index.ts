import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import glob from 'glob';
import path from 'path';
import vm from 'vm';
import { spawn } from 'child_process'
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

let dir = path.join(__dirname, flags.get('dir')).replace(/\/+$/, '') + '/**/**.mlhp';

glob.sync(dir).forEach(async a => {
    let uri = a.split(path.join(__dirname, flags.get('dir')))[1].split('.mlhp')[0] == '/index' ? '/' : a.split(path.join(__dirname, flags.get('dir')))[1].split('.mlhp')[0]

    let parsed = await parse(fs.readFileSync(a).toString(), uri)

    parsed.forEach((p: [string, string[][], string]) => {
        console.log(p)
        app[p[0].toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'head' | 'options'](uri, async (req, res, next) => {
            let final = p[2]

            for (let i = 0; i < p[1].length; i++) {
                const type = p[1][i][0]
                // console.log(p[1][i][2])
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
                console.log(args)
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
        this.term = (...args: any[]) => new Promise(res => {
            let buffs: Buffer[] = []
            let proc = spawn('python3', ['./src/eval.py', ...args], { timeout })
            proc.stderr.on('data', (data) => buffs.push(data));
            proc.stdout.on('data', (data) => buffs.push(data));
            proc.on('close', (code) => {
                let str = Buffer.concat(buffs).toString()
                str = str.split('\n').slice(0, str.split('\n').length - 1).join('\n')
                console.log('py exited with code', code);
                res(str);
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
            protocol: req.protocol
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
    code: string;
    constructor(code: string) {
        this.code = code;
    }

    async exec(req: Request, res: Response, next: NextFunction) {
        return await Promise.resolve('Not implemented')
    }
}

app.listen(flags.get('port'), () => {
    console.log('Listening on port', flags.get('port'), 'with pid', process.pid);
})