export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
}

export class ImmediateUnitOfWork implements UnitOfWork {
  async run<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}
