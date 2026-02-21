## Arika View

`@arikajs/view` is the server-side rendering (SSR) and template engine for the ArikaJS framework.

It allows developers to render dynamic HTML using a clean, expressive template syntax inspired by modern server frameworks — while remaining lightweight, secure, and framework-agnostic.

```ts
import { View } from '@arikajs/view';

const view = new View({
    viewsPath: './views',
    cachePath: './storage/views',
});

const html = await view.render('home', {
    title: 'Welcome to ArikaJS',
});
```

The View package enables presentation logic in ArikaJS, transforming templates into clean HTML output with safe escaping and high performance.

---

### Status

- **Stage**: Experimental / v0.x
- **Scope (v0.x)**:
  - Template compilation & rendering
  - Layout & section management
  - Components & slots architecture (`@component`, `@slot`)
  - Stackable content (`@push`, `@stack`)
  - Global shared data (`view.share()`)
  - Basic control structures (`@if`, `@for`, `@unless`, `@empty`)
  - Safe output escaping
  - Template caching
- **Out of scope (for this package)**:
  - HTTP request/response handling (see `@arikajs/http`)
  - Route matching (see `@arikajs/router`)
  - Authentication logic

---

## 🎯 Purpose

The View package is the presentation layer of the ArikaJS ecosystem. It is responsible for:
- Rendering templates into HTML
- Managing layouts and partials
- Escaping output safely
- Supporting control structures
- Providing a foundation for Web views, Email templates, and Error pages.

---

## 🧠 Responsibilities

### ✅ What Arika View Does
- Compile templates into renderable functions
- Render templates with dynamic data
- Support layouts, sections, and includes
- Provide basic control structures (`if`, `for`)
- Escape output by default
- Cache compiled templates for performance

### ❌ What Arika View Does NOT Do
- Handle HTTP requests or responses
- Match routes
- Manage authentication
- Execute business logic

---

## 🧬 Rendering Flow

```
Controller
  ↓
View.render()
  ↓
Template Compiler
  ↓
Compiled Template
  ↓
HTML Output
```

---

## Features

- **Simple, expressive template syntax**
  - Clean tags for logic and output.
- **Layout & section support**
  - Powerful inheritance model for UI consistency.
- **Components & Slots Architecture**
  - Build robust, reusable UI components like buttons, alerts, and modals.
- **CSS/JS Stacks**
  - `@push` scripts and styles from partials into the document `<head>`.
- **Global Data Sharing**
  - Pass global variables (e.g. `user`, `config`) to all views at once.
- **Partial / include support**
  - Modularize your templates into reusable components.
- **Safe output escaping**
  - Protection against XSS by default.
- **Custom directives**
  - Extend the engine with your own syntax.
- **Template caching**
  - High-performance rendering via pre-compiled templates.

---

## Installation

```bash
npm install @arikajs/view
# or
yarn add @arikajs/view
# or
pnpm add @arikajs/view
```

---

## 🧩 Template Syntax

### Variable Output
```html
<h1>{{ title }}</h1>
```
*Escaped by default.*

### Raw Output
```html
{!! html !!}
```

### Conditionals
```html
@if (user)
    <p>Welcome, {{ user.name }}</p>
@elseif (guest)
    <p>Please login</p>
@endif

@unless (isEditor)
    <p>You cannot edit this post.</p>
@endunless

@empty (items)
    <p>There are no items to display.</p>
@endempty
```

### Loops
```html
@for (item in items)
    <li>{{ item }}</li>
@endfor
```

### Includes & Components
```html
<!-- Simple include -->
@include('partials.header')

<!-- Reusable Component -->
@component('components.alert', { type: 'danger' })
    @slot('title')
        Error!
    @endslot
    
    This is the default slot output.
@endcomponent
```
*(In `components/alert.html`, you would output `{!! title !!}` and `{!! slot !!}`)*

### Stackable Scripts & Styles
You can push output to a stack from deep within child views or components, and render them all at once in the main layout.

**child.html**
```html
@push('scripts')
    <script src="https://cdn.example.com/widget.js"></script>
@endpush
```

**layout.html**
```html
<head>
    @stack('scripts')
</head>
```

### Layouts & Sections

**layout.html**
```html
<html>
<body>
    @yield('content')
</body>
</html>
```

**page.html**
```html
@extends('layout')

@section('content')
    <h1>Hello World</h1>
@endsection
```

---

## 🔌 Usage

### Basic Rendering
```ts
import { View } from '@arikajs/view';

const view = new View({
    viewsPath: './views',
    cachePath: './storage/views',
});

// Share global data
view.share('appName', 'ArikaJS Project');

const html = await view.render('home', {
    title: 'Welcome to ArikaJS',
});
```

### Controller Integration
*(Typically provided by the HTTP Kernel)*
```ts
return view('dashboard', {
    user,
});
```

---

## ⚙️ Configuration Options

```ts
{
  viewsPath: string;           // Directory containing templates
  cachePath?: string;          // Directory for compiled templates
  extension?: '.html' | '.ark'; // Template file extension
  cache?: boolean;             // Enable/disable caching
}
```

---

## 🧱 Project Structure

- `src/`
  - `View.ts` – Main entry point
  - `Engine.ts` – Execution context
  - `Compiler.ts` – Template string to JS compiler
  - `Template.ts` – Template resolution and state
  - `Directives/` – Built-in controls
    - `If.ts`, `For.ts`, `Include.ts`, `Section.ts`
  - `index.ts` – Public exports
- `tests/` – Unit and integration tests
- `package.json`
- `tsconfig.json`
- `README.md`
- `LICENSE`

---

## Versioning & Stability

- While in **v0.x**, the API may change between minor versions.
- Once the API stabilizes, `@arikajs/view` will move to **v1.0** and follow **semver** strictly.

---

## Contributing

Contributions are welcome! Please ensure all pull requests include tests and follow the project's coding standards.

---

## License

`@arikajs/view` is open-sourced software licensed under the **MIT license**.

---

## 🧠 Philosophy

> “Presentation is a reflection of logic, not a home for it.”
