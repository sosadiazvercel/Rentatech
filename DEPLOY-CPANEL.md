# Despliegue en cPanel / Passenger

Guia para subir cambios de Renta Tech a:

```text
https://rentatech.sosadiazeventos.com
```

Ruta en el servidor:

```text
/home/sosadi5/webs/stagging/rentatech.sosadiazeventos.com
```

## 1. Preparar el ZIP local

No subir el proyecto completo con `.next/cache`, `.next/dev`, `.git`, `.local` ni `node_modules` local.

Usar un ZIP liviano con el codigo fuente:

```text
src/
public/
config/
docs/
scripts/
supabase/
plantillas/
package.json
package-lock.json
pnpm-lock.yaml
pnpm-workspace.yaml
next.config.ts
tsconfig.json
app.js
.env.example
```

No subir `.env` si contiene secretos locales. Crear o editar el `.env` directamente en el servidor.

## 2. Subir y extraer

En cPanel File Manager:

1. Entrar a:

```text
/home/sosadi5/webs/stagging/rentatech.sosadiazeventos.com
```

2. Subir el ZIP liviano.
3. Extraerlo en esa misma carpeta.
4. Verificar que `package.json`, `next.config.ts`, `src/` y `public/` queden en la raiz de esa carpeta.

## 3. Instalar y compilar en el servidor

Abrir Terminal en cPanel:

```bash
cd /home/sosadi5/webs/stagging/rentatech.sosadiazeventos.com
npm install
npm run build
```

El build debe crear:

```text
.next/standalone
.next/static
```

## 4. Copiar assets al standalone

Despues del build, correr:

```bash
cd /home/sosadi5/webs/stagging/rentatech.sosadiazeventos.com
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cp .env .next/standalone/.env
```

Si pregunta si desea sobrescribir `.env`, responder `y`.

## 5. Configuracion de Application Manager

En cPanel > Application Manager > Rentatech > Edit:

```text
Deployment Domain:
rentatech.sosadiazeventos.com

Base Application URL:
/

Application Path:
webs/stagging/rentatech.sosadiazeventos.com/.next/standalone

Deployment Environment:
Production

Startup file:
server.js
```

Variables recomendadas:

```text
NODE_ENV=production
HOSTNAME=127.0.0.1
```

No configurar `PORT`; Passenger lo asigna.

## 6. `.htaccess` requerido

El dominio puede mostrar `Index of /` si Apache sirve la carpeta directamente en vez de enviar la peticion a Passenger.

Crear o editar este archivo:

```text
/home/sosadi5/webs/stagging/rentatech.sosadiazeventos.com/.htaccess
```

Contenido:

```apache
PassengerEnabled on
PassengerAppRoot /home/sosadi5/webs/stagging/rentatech.sosadiazeventos.com/.next/standalone
PassengerBaseURI /
PassengerAppType node
PassengerStartupFile server.js
PassengerAppEnv production
PassengerNodejs /opt/cpanel/ea-nodejs20/bin/node

Options -Indexes
```

## 7. Reiniciar Passenger

Despues de cada build o cambio de configuracion:

```bash
mkdir -p /home/sosadi5/webs/stagging/rentatech.sosadiazeventos.com/.next/standalone/tmp
touch /home/sosadi5/webs/stagging/rentatech.sosadiazeventos.com/.next/standalone/tmp/restart.txt
```

Luego abrir:

```text
https://rentatech.sosadiazeventos.com
```

## 8. Prueba manual si falla

Si aparece una pantalla de Passenger con:

```text
We're sorry, but something went wrong.
```

probar en Terminal:

```bash
cd /home/sosadi5/webs/stagging/rentatech.sosadiazeventos.com
node .next/standalone/server.js
```

Si muestra:

```text
Ready
```

la app arranca bien. Cortar con `Ctrl + C` y revisar `.htaccess` / Application Manager.

Si aparece:

```text
"next start" does not work with "output: standalone"
```

se esta arrancando mal. Debe usarse:

```bash
node .next/standalone/server.js
```

no:

```bash
node app.js
```

## 9. Problemas comunes

### El ZIP pesa mas de 1 GB

Se incluyeron carpetas de desarrollo. No subir:

```text
.next/cache
.next/dev
.git
.local
node_modules
```

### Sale `Index of /`

Apache esta mostrando la carpeta. Revisar `.htaccess` y confirmar que Passenger apunte a:

```text
webs/stagging/rentatech.sosadiazeventos.com/.next/standalone
```

### Falla `Ensure dependencies`

cPanel puede intentar usar:

```text
/opt/cpanel/ea-nodejs20/bin/npm install
```

Si la app ya fue compilada y `.next/standalone/node_modules` existe, no depender de `Ensure dependencies`. Usar Terminal con `npm install` y `npm run build`.

### Cambio de `.env`

Despues de editar `.env`, copiarlo al standalone:

```bash
cp /home/sosadi5/webs/stagging/rentatech.sosadiazeventos.com/.env /home/sosadi5/webs/stagging/rentatech.sosadiazeventos.com/.next/standalone/.env
touch /home/sosadi5/webs/stagging/rentatech.sosadiazeventos.com/.next/standalone/tmp/restart.txt
```

