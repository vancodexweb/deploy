type Listener = (data: string) => void;

const clients = new Set<Listener>();

export function addClient(listener: Listener): void {
  clients.add(listener);
}

export function removeClient(listener: Listener): void {
  clients.delete(listener);
}

export function broadcast(payload: unknown): void {
  const data = JSON.stringify(payload);
  for (const listener of clients) {
    listener(data);
  }
}
