# Domain Notes

## Keys and Identifiers

### Materia
- `id_materia` (numérico): código visible entre paréntesis en el label.
- Ejemplo: `(1) Historia de la Psicología`.

### Cátedra
- `id_catedra` (numérico): identificador técnico global del sistema.
- Ejemplo: `34` en `Cátedra 34 (II)`.
- Se usa para reconstrucción estable de elecciones.

### Número romano de cátedra
- `I`, `II`, `III`, etc.
- Es una clave humana dentro de una materia, no global.

### Comisión (tríada)
- La inscripción operativa se define por comisión práctica.
- Una comisión puede implicar 1, 2 o 3 slots:
  - práctica (comisión)
  - teórico (opcional)
  - seminario (opcional)

## Export/Import (v1)

Formato actual:

```json
{
  "version": 1,
  "type": "enrollments-projection",
  "exportedAt": "2026-03-06T20:56:55.354Z",
  "period": "2026-01",
  "enrollments": [
    { "catedra": 34, "comision": 9 }
  ]
}
```

## Reconstruction Rule

La reconstrucción usa:
- `catedra` + `comision`

Mapeo actual:
1. buscar `subjectId` por número de cátedra
2. validar que la comisión exista para esa cátedra en la oferta cargada
3. aplicar regla de una cátedra por materia

Si algún par no existe en la oferta actual, se descarta en importación.
