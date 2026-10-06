# Sistema de Cine — Documento de Requerimientos

> Resume todo lo pedido en el intercambio de emails del enunciado. Cada requerimiento
> tiene su regla de negocio.

---

## 1. Contexto

Un cine de **un solo edificio con varias salas**. Se necesita una aplicación web
completa donde:

- Los **clientes** compran entradas (y comida del candy bar) y reciben un **PDF con
  un QR** para presentar en el cine.
- Se puede comprar **registrado** (con beneficios) o de forma **anónima** (solo hay
  que pagar).
- Los **administradores** controlan absolutamente todo: películas, funciones, salas,
  butacas, productos, precios, cupones, reportes.
- Los **empleados** validan los QR en la entrada del cine y en el candy bar.

---

## 2. Actores / Roles

| Rol | Qué puede hacer |
|-----|-----------------|
| **Anónimo (visitante)** | Ver cartelera, buscar películas, ver reseñas y puntaje promedio, comprar entradas y comida pagando (sin beneficios). |
| **Cliente registrado** | Todo lo anterior + cupón de bienvenida, puntos de fidelización, reseñas, historial ("Mis películas"), crédito por cancelaciones, alertas de "Próximamente", perfil. |
| **Administrador** | Administración de películas, funciones, salas, butacas, productos, categorías, combos, cupones, recompensas de puntos, preventa; ver reportes y gráficos; exportar; ver log de actividad. |
| **Empleado** | Escanear/ingresar QR para validar entradas (cine) y retiros (candy bar). Ingreso manual del código si el lector falla. |

> **Regla:** una vez que un QR se valida (entrada usada) o se entrega la comida, ese
> QR **deja de funcionar**.

---

## 3. Salas y butacas

- El cine tiene **6 salas**, todas con **la misma forma**.
- Distribución: **20 filas** numeradas con letras (A → T) y **3 columnas** de
  **4, 20 y 4** butacas → 28 butacas por fila.
- Las filas **J y K** (las dos del medio) se reemplazan por **una fila de butacas
  accesibles**, con columnas de **2, 10 y 2** butacas.
- **Butacas VIP:** las **últimas 3 filas (R, S, T)** de cada sala. Precio más alto,
  se marcan visualmente distinto, y el usuario tiene que saber que está comprando VIP
  **antes** de pagar.
- **Tiempo real:** mientras un usuario selecciona butacas, debe ver cuáles ya están
  ocupadas por otra compra en ese mismo momento.

---

## 4. Películas

Cada película tiene: **nombre, imagen/póster, sinopsis, duración**, **uno o varios
géneros**, y opcionalmente **restricción de edad** (18, 13, o ninguna).

- **Duración:** no puede haber una función que empiece **antes de que pasen 30
  minutos** desde que terminó la función anterior **en esa misma sala**.
- **Restricción de edad:** menores de 18 no compran +18, menores de 13 no compran
  +13. Toda entrada de una película con restricción debe **aclarar que debe ir un
  adulto**.

### Reseñas
Cada persona puede calificar con estrellas y dejar un comentario corto, visible
**antes** de comprar. Se muestra el puntaje promedio.

### Cartelera / listado
La página principal muestra primero las **3 películas más vendidas**. El listado
completo tiene un **buscador**, con filtro por **género** (una película puede tener
varios).

### Próximamente + Preventa
Sección de estrenos próximos con alerta de disponibilidad. Preventa: 7 días antes del
estreno, precio especial; después vuelve al precio normal, configurable por película.

---

## 5. Funciones (proyecciones)

Cada función: película, fecha/hora, **formato** (2D/3D/4D/5D), **idioma**
(castellano/subtitulada), y sala (asignada automáticamente).

- El admin define horarios (ej: "lunes, martes y viernes a las 18hs"); **el sistema
  asigna la sala automáticamente**.
- **Regla dura:** nunca dos funciones en la misma sala al mismo tiempo (considerando
  duración + 30 min de recambio).

---

## 6. Compra de entradas

1. Película → función (fecha, hora, formato, idioma).
2. Mapa de butacas en tiempo real.
3. (Opcional) Candy bar / combos.
4. Cupón / puntos / crédito si corresponde.
5. Pago.
6. PDF con los datos + QR. El mismo QR sirve para retirar la comida.

### Beneficios del registro
- Cupón de bienvenida (20%, primera compra), **porcentaje configurable** por el
  admin.
- Cupones para usuarios de **más de 50 años**.

### Cancelación
Hasta 2 horas antes de la función → **crédito en la cuenta**, no reembolso. Se puede
combinar con otros medios de pago.

---

## 7. Candy bar

Productos organizados en **categorías**, se compran junto con la entrada, se retiran
con el mismo QR. **Combos** (entrada + pochoclos + bebida) a precio fijo
configurable, destacados en la compra.

---

## 8. Fidelización / puntos

1 punto por peso gastado. Canjeables por entradas o candy, con costo en puntos
configurable por el admin. Historial visible en el perfil. **No transferibles**.

---

## 9. Panel de administración

Gestión de películas, funciones (con asignación automática), salas, productos,
categorías, combos, cupones, recompensas.

### Reportes
Facturación diaria, exportación a PDF/Excel, gráfico de películas más vistas (semana
y mes), producto más vendido.

### Log de actividad
Quién creó qué función, quién modificó un precio, quién validó un QR — con fecha y
hora.

---

## 10. Datos de usuario (registro)

Mail, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos, cantidad
de días de vacaciones por año.

---

## 11. Perfil del cliente

Puntos, crédito, **"Mis películas"** (historial visual con calificación propia),
alertas de "Próximamente" activadas.

---

## 12. Reglas de negocio críticas

1. Nunca dos funciones en la misma sala al mismo tiempo (+30 min de recambio).
2. Asignación de sala automática al crear una función.
3. QR de un solo uso por concepto (entrada / comida).
4. Cupón de bienvenida = solo primera compra, porcentaje configurable.
5. Cupón +50 años = según fecha de nacimiento.
6. Restricción de edad bloquea la compra según edad del usuario registrado.
7. Butacas ocupadas visibles en tiempo real.
8. VIP (R, S, T) más caras + aviso previo; accesibles resaltadas.
9. Puntos: 1 por peso, canje configurable, no transferibles.
10. Cancelación hasta 2h antes → crédito, no reembolso.
11. Preventa: precio especial hasta 7 días antes del estreno.
12. Películas más vendidas primero en el home.
13. Todo cambio administrativo sensible queda en el log de actividad.

---


