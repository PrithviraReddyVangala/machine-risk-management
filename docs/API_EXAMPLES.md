# API examples

## Add Humidity

```http
POST /api/fields
Content-Type: application/json
```

```json
{
  "field_name": "Humidity",
  "field_type": "number",
  "required": false,
  "options": []
}
```

## Create machine

```http
POST /api/machines
Content-Type: application/json
```

```json
{
  "values": {
    "1": "Machine A",
    "2": "85",
    "3": "120",
    "4": "High",
    "5": "65"
  }
}
```

The numeric keys are field IDs returned by `GET /api/fields`.

## Predict

```http
POST /api/machines/1/predict
```

The backend retrieves the machine data and sends only the currently supported ML features to the Python service.
