import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, of, pipe, throwError } from 'rxjs';
import { catchError, map, mergeMap, take } from 'rxjs/operators';
import { EntityStoreConfig } from '../models/entity-store-config';
import { EntityStorePage } from '../models/entity-store-page';

import qs from 'qs';

const collectionParseErrorMessage = '[NgrxRestApiStore][EntityCrudService] Could not parse http response. Define or update parseCollectionHttpResponse in entityStoreConfig, please';
const entityParseErrorMessage     = '[NgrxRestApiStore][EntityCrudService] Could not parse http response. Define or update parseEntityHttpResponse in entityStoreConfig, please';

export abstract class EntityCrudService<T> {

  protected constructor(
    protected entityName: string,
    protected entityStoreConfig: EntityStoreConfig,
    protected httpClient: HttpClient
  ) {
    if (!entityStoreConfig || !entityStoreConfig.entities || !entityStoreConfig.entities[entityName]) {
      throw new Error(`EntityStore: entity configuration for ${entityName} was not found. Add it, please`);
    }
  }

  findAll$(filter: any = null): Observable<EntityStorePage<T>> {

    return this.httpClient
      .get(`${this.getApiEndpoint()}${this.getQueryString(filter)}`, { observe: 'response' })
      .pipe(
        catchError(this.onError),
        take(1),
        map(httpResponse => this.entityStoreConfig.parseCollectionHttpResponse(httpResponse, { filter })),
        mergeMap((entityStorePage: EntityStorePage<T>) => {
          if (!entityStorePage || !Array.isArray(entityStorePage.entities) || isNaN(+entityStorePage.totalEntities)) {
            return throwError(`${collectionParseErrorMessage} (${this.entityName})`);
          }
          return of(entityStorePage);
        })
      );
  }

  findByKey$(key: any, filter: any = null): Observable<T> {
    return this.httpClient
      .get<T>(`${this.getApiEndpoint()}/${key}`, { observe: 'response' })
      .pipe(
        mergeMap(httpResponse => {
          return this.processEntityHttpResponse(httpResponse, { key, filter });
        })
      );
  }

  save$(entity: T): Observable<T> {

    let obs$;

    if (entity['id']) {
      obs$ = this.httpClient.put(`${this.getApiEndpoint()}/${entity['id']}`, entity, { observe: 'response' });
    } else {
      obs$ = this.httpClient.post(`${this.getApiEndpoint()}`, entity, { observe: 'response' });
    }

    return obs$.pipe(
      mergeMap((httpResponse: HttpResponse<T>) => {
        return this.processEntityHttpResponse(httpResponse, { entity });
      })
    );
  }

  deleteByKey$(key: number): Observable<T> {
    return this.httpClient
      .delete(`${this.getApiEndpoint()}/${key}`, { observe: 'response' })
      .pipe(
        mergeMap((httpResponse: HttpResponse<T>) => {
          return this.processEntityHttpResponse(httpResponse, { key });
        })
      );
  }

  // === Utility functions =========================================================================================

  private processEntityHttpResponse(initialHttpResponse: HttpResponse<T>, params: any): Observable<T> {

    return of(initialHttpResponse)
      .pipe(
        catchError(this.onError),
        take(1),
        map(httpResponse => this.entityStoreConfig.parseEntityHttpResponse(httpResponse, params)),
        mergeMap((entity: T) => {
          if (!entity) {
            return throwError(`${entityParseErrorMessage}  (${this.entityName})`);
          }
          return of(entity);
        })
      );

  }

  private getApiEndpoint() {
    return `${this.entityStoreConfig.apiUrl}/${this.entityStoreConfig.entities[this.entityName].apiPath}`;
  }

  private getQueryString(query: any = null) {
    const queryString = qs.stringify(query);
    return ((queryString !== '') ? '?' : '') + queryString;
  }

  private onError(err) {
    return throwError(err);
  }

}
