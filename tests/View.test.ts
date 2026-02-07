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
