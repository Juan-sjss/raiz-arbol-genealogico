# 🌳 Raíz

[![Android APK](https://github.com/Juan-sjss/raiz-arbol-genealogico/actions/workflows/android.yml/badge.svg)](https://github.com/Juan-sjss/raiz-arbol-genealogico/actions/workflows/android.yml)

**Tu árbol genealógico, en tu bolsillo.**

Raíz es una app para Android (y web) con la que puedes armar y explorar tu historia
familiar sin conexión. No hay cuentas, ni servidores, ni anuncios: **tus datos se
quedan en tu dispositivo**.

<p align="center">
  <em>Hecha con React + TypeScript + Vite, empaquetada como app nativa con Capacitor.</em>
</p>

---

## ✨ Qué puedes hacer

- **Ver el árbol completo** en un lienzo con arrastre, zoom con pellizco y botones de
  acercar / alejar / ver todo.
- **Añadir personas** con nombre, apellidos, sexo, fechas, lugar de nacimiento,
  ocupación, notas y foto.
- **Crear vínculos**: padres, parejas e hijos. Si añades un hijo a una pareja, se
  vinculan automáticamente los dos progenitores.
- **Editar y eliminar** fichas, y desvincular relaciones sin borrar a la persona.
- **Buscar** por nombre, año o lugar (tolera tildes: «sofia» encuentra a «Sofía»).
- **Exportar e importar** un respaldo en JSON para no perder nada o pasarlo a otro
  teléfono.
- **Tema claro y oscuro**.
- **100 % offline**: sin permisos de internet ni rastreo.

## 📱 La app en Android

La app web se empaqueta con [Capacitor](https://capacitorjs.com/) dentro de un
proyecto Android nativo. El resultado es un APK que funciona sin conexión.

### Instalar el APK

**⬇️ [Descargar la última versión](../../releases/latest)**

1. Descarga el APK desde la pestaña **Releases** del repositorio (o compílalo tú
   mismo, ver abajo).
2. En el teléfono, abre el archivo y permite instalar apps de origen desconocido
   cuando Android lo pida.

> Es un APK de depuración firmado con la clave de depuración de Android: sirve para
> instalar y probar, pero no para publicar en Google Play. Para la tienda necesitas
> generar tu propio keystore y firmar un build de release.

### Compilar el APK en tu equipo

Requisitos:

- [Node.js](https://nodejs.org/) 20 o superior
- JDK 21
- Android Studio (o el SDK de Android con las *build-tools* instaladas)

```bash
npm install
npm run android:apk
```

El APK queda en:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

También puedes abrir el proyecto nativo en Android Studio con `npm run android:open`.

## 🌐 Probarlo en el navegador

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## 🧱 Cómo está hecho

| Pieza | Tecnología |
| --- | --- |
| Interfaz | React 19 + TypeScript |
| Build | Vite |
| App nativa | Capacitor 8 (Android) |
| Estado | React Context + `localStorage` |
| Layout del árbol | Algoritmo propio de generaciones, baricentro y ajuste isotónico |
| Exportar / compartir | `@capacitor/filesystem` + `@capacitor/share` |

### Estructura

```
src/
├─ components/      Tarjetas, ficha de persona, formularios, menús…
├─ data/sample.ts   Árbol de ejemplo (familia García)
├─ hooks/           Zoom y arrastre del lienzo
├─ lib/
│  ├─ layout.ts     Cálculo de posiciones del árbol
│  ├─ storage.ts    Guardado y validación en localStorage
│  ├─ backup.ts     Exportar / importar respaldos
│  └─ tree.ts       Consultas de parentesco
├─ store/           Estado global del árbol
└─ types.ts         Modelo de datos
```

### Modelo de datos

```ts
interface Person {
  id: string
  firstName: string
  lastName: string
  sex: 'male' | 'female' | 'unknown'
  birthDate?: string
  deathDate?: string
  birthPlace?: string
  occupation?: string
  notes?: string
  photo?: string // data URL comprimida
}

interface Relationship {
  id: string
  type: 'parent' | 'partner'
  from: string // madre/padre, o una de las dos parejas
  to: string   // hijo/a, o la otra pareja
}
```

Todo el árbol se guarda como un único JSON en `localStorage`, bajo la clave
`raiz.tree.v1`, y se exporta con el mismo formato.

## 🔐 Privacidad

- No hay backend ni cuentas.
- La app **no hace peticiones a internet**: la interfaz se sirve desde el propio APK
  y el árbol nunca sale del teléfono.
- Las fotos se comprimen y se guardan dentro del propio árbol (data URL).
- Si borras la app o los datos del navegador, pierdes el árbol: **exporta un
  respaldo** de vez en cuando. 😉

## 🗺️ Roadmap

- [ ] Importar y exportar GEDCOM (compatible con MyHeritage, Ancestry, etc.)
- [ ] Varios árboles por dispositivo
- [ ] Fechas parciales («1958», «circa 1900») con validación amable
- [ ] Compartir el árbol como imagen o PDF
- [ ] Sincronización opcional cifrada de extremo a extremo
- [ ] Traducción a otros idiomas

Las ideas y los informes de errores son bienvenidos en la pestaña
[Issues](../../issues).

## 🤝 Contribuir

1. Haz un *fork* del repositorio.
2. Crea una rama: `git checkout -b mi-mejora`.
3. Haz tus cambios y ejecuta `npm run build` para comprobar tipos y build.
4. Abre un *pull request* describiendo el cambio.

Este proyecto usa un estilo de código sencillo: TypeScript estricto, componentes
funcionales y CSS con variables. Intenta mantener la interfaz en español.

## 📄 Licencia

[MIT](LICENSE). Úsalo, modifícalo y compártelo libremente.
