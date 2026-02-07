import { View } from '../src/View';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import assert from 'node:assert';
import { test, before, after } from 'node:test';

const tempDir = path.join(os.tmpdir(), 'arika-view-tests');

before(() => {
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
});

after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
});

test('View renders variables and escapes output', async () => {
    const viewsPath = path.join(tempDir, 'variables');
    fs.mkdirSync(viewsPath, { recursive: true });
    fs.writeFileSync(path.join(viewsPath, 'test.html'), '<h1>{{ title }}</h1><p>{!! raw !!}</p>');

    const view = new View({ viewsPath });
    const html = await view.render('test', {
        title: '<b>Hello</b>',
        raw: '<span>Safe</span>'
    });

    assert.strictEqual(html.trim(), '<h1>&lt;b&gt;Hello&lt;/b&gt;</h1><p><span>Safe</span></p>');
});

test('View handles conditionals', async () => {
    const viewsPath = path.join(tempDir, 'conditionals');
    fs.mkdirSync(viewsPath, { recursive: true });
    fs.writeFileSync(path.join(viewsPath, 'test.html'), '@if (show) Yes @else No @endif');

    const view = new View({ viewsPath });

    assert.strictEqual((await view.render('test', { show: true })).trim(), 'Yes');
    assert.strictEqual((await view.render('test', { show: false })).trim(), 'No');
});

test('View handles loops', async () => {
    const viewsPath = path.join(tempDir, 'loops');
    fs.mkdirSync(viewsPath, { recursive: true });
    fs.writeFileSync(path.join(viewsPath, 'test.html'), '<ul>@for (item of items)<li>{{ item }}</li>@endfor</ul>');

    const view = new View({ viewsPath });
    const html = await view.render('test', { items: ['A', 'B'] });

    assert.strictEqual(html.trim(), '<ul><li>A</li><li>B</li></ul>');
});

test('View handles layouts and sections', async () => {
    const viewsPath = path.join(tempDir, 'layouts');
    fs.mkdirSync(viewsPath, { recursive: true });

    fs.writeFileSync(path.join(viewsPath, 'layout.html'), '<html><body>@yield("content")</body></html>');
    fs.writeFileSync(path.join(viewsPath, 'page.html'), '@extends("layout") @section("content") <h1>Hello</h1> @endsection');

    const view = new View({ viewsPath });
    const html = await view.render('page');

    assert.ok(html.includes('<html><body>'));
    assert.ok(html.includes('<h1>Hello</h1>'));
    assert.ok(html.includes('</body></html>'));
});

test('View handles includes', async () => {
    const viewsPath = path.join(tempDir, 'includes');
    fs.mkdirSync(viewsPath, { recursive: true });

    fs.writeFileSync(path.join(viewsPath, 'header.html'), '<header>{{ title }}</header>');
    fs.writeFileSync(path.join(viewsPath, 'page.html'), '@include("header") content');

    const view = new View({ viewsPath });
    const html = await view.render('page', { title: 'Welcome' });

    assert.strictEqual(html.trim(), '<header>Welcome</header> content');
});

test('View uses cache for improved performance', async () => {
    const viewsPath = path.join(tempDir, 'cache');
    fs.mkdirSync(viewsPath, { recursive: true });
    fs.writeFileSync(path.join(viewsPath, 'test.html'), 'Cache Me');

    const view = new View({ viewsPath, cache: true });

    // First render - compiles
    await view.render('test');

    // Modify file on disk
    fs.writeFileSync(path.join(viewsPath, 'test.html'), 'New Content');

    // Second render - should still return old content from cache
    const html = await view.render('test');
    assert.strictEqual(html.trim(), 'Cache Me');
});

test('View handles static ${} and backticks safely', async () => {
    const viewsPath = path.join(tempDir, 'escaping-js');
    fs.mkdirSync(viewsPath, { recursive: true });
    fs.writeFileSync(path.join(viewsPath, 'test.html'), '<div>${price}</div> `backticks`');

    const view = new View({ viewsPath });
    const html = await view.render('test');

    assert.strictEqual(html.trim(), '<div>${price}</div> `backticks`');
});

test('View supports custom directives', async () => {
    const viewsPath = path.join(tempDir, 'custom-directives');
    fs.mkdirSync(viewsPath, { recursive: true });
    fs.writeFileSync(path.join(viewsPath, 'test.html'), '@hello(World)');

    const view = new View({ viewsPath });

    view.addDirective({
        name: 'hello',
        handle(content: string) {
            if (content.startsWith('@hello')) {
                const name = content.match(/@hello\((.*)\)/)?.[1] || 'Guest';
                return `_output += "Hello, ${name}!";\n`;
            }
            return '';
        }
    });

    const html = await view.render('test');
    assert.strictEqual(html.trim(), 'Hello, World!');
});
