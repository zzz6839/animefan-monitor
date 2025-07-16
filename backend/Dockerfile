FROM python:3.11-slim

WORKDIR /app

# Create data directory
RUN mkdir -p /app/data

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 58000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "58000", "--reload"]
