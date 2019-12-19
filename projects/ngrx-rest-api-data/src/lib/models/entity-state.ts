export class EntityState<T> {
  status: string;
  isBusy: boolean;
  entity: T;
  error?: any;
}

export class EntityCollectionState<T> {
  status: string;
  isBusy: boolean;
  apiFilter: any;
  entityStates: EntityState<T>[];
  totalEntities: number;
  error?: any;
}

export class EntityStoreState<T> {

  selectedEntity: EntityState<T>;
  collection: EntityCollectionState<T>;

}
