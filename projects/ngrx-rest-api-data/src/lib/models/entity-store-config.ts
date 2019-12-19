import { HttpResponse } from '@angular/common/http';
import { EntityStorePage } from './entity-store-page';

export class EntityConfig {
  entityName?: string;
  apiPath?: string;
  storeKey?: string;
  keyProperty?: string;
}

export class EntityStoreConfig {
  apiUrl: string;
  busyIndicationDelay?: number;
  entities: { [key: string]: EntityConfig };

  parseCollectionHttpResponse?;
  parseEntityHttpResponse?;
}

export const defaultEntityStoreConfig: EntityStoreConfig = {
  busyIndicationDelay: 300,
  apiUrl: null,
  entities: {},

  parseCollectionHttpResponse(httpResponse: HttpResponse<object>, params: any): EntityStorePage<object> {
    return httpResponse.body as EntityStorePage<object>;
  },

  parseEntityHttpResponse(httpResponse: HttpResponse<object>, params: any): object {
    return httpResponse.body;
  }

};

export const defaultEntityConfig: EntityConfig = {
  keyProperty: 'id'
};
