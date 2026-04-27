# Easy Tech - Gestión de Centro de Reparación

Este proyecto es una aplicación profesional construida con **Next.js 15**, **Tailwind CSS**, **ShadCN UI** y **Firebase**.

## 🚀 Guía de Migración (Firebase Studio -> Otros Entornos)

Si necesitas mover este proyecto a **Google AI Studio**, **Google Antigravity** o tu entorno local, sigue estos pasos:

### 1. Descarga del Código
Utiliza la función de exportación o descarga de Firebase Studio para obtener el proyecto en un archivo `.zip`.

### 2. Configuración Local
1.  **Instalar Dependencias**: Una vez extraído el código, ejecuta:
    ```bash
    npm install
    ```
2.  **Variables de Entorno**: Asegúrate de que las credenciales en `src/lib/firebase.ts` sean las correctas para tu proyecto de Firebase en producción.

### 3. Ejecución
Para iniciar el servidor de desarrollo localmente:
```bash
npm run dev
```

### 4. Integración con Google AI Studio
Si deseas usar las capacidades de IA en Google AI Studio:
1.  Obtén tu API Key en [Google AI Studio](https://aistudio.google.com/).
2.  Configura las variables de entorno necesarias para **Genkit** (el framework de IA que usa este proyecto).

## 🛠 Stack Tecnológico
- **Framework**: Next.js 15 (App Router)
- **Estilos**: Tailwind CSS + ShadCN UI
- **Base de Datos**: Firestore
- **Autenticación**: Firebase Auth
- **IA**: Genkit para flujos generativos

## 📂 Estructura del Proyecto
- `src/app`: Rutas y páginas de la aplicación.
- `src/components`: Componentes reutilizables e interfaz de usuario.
- `src/services`: Lógica de conexión con Firebase Firestore.
- `src/lib`: Utilidades, tipos de TypeScript y configuración base.
- `src/hooks`: Hooks personalizados (Autenticación, Toasts, etc.).

---
*Este proyecto fue prototipado originalmente en Firebase Studio.*
