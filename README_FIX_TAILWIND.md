# Corrección aplicada

El error de pantalla era por instalar `tailwindcss` en versión latest. Actualmente Tailwind v4 separó el plugin de PostCSS y Next muestra este error:

> It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin

Esta versión fija `tailwindcss` a `3.4.17`, que es compatible con:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

y con este `postcss.config.js`:

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

## Si ya instalaste dependencias antes

Borra instalaciones antiguas y reinstala:

```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

En Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
npm run dev
```
