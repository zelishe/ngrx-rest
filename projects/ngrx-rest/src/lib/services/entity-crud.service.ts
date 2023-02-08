import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, mergeMap, take } from 'rxjs/operators';
import {
  defaultEntityConfig,
  defaultEntityStoreConfig,
  EntityConfig,
  EntityStoreConfig
} from '../models/entity-store-config';
import { EntityStorePage } from '../models/entity-store-page';

import qs from 'qs';

const collectionParseErrorMessage = '[NgrxRestApiStore][EntityCrudService] Could not parse http response. Define or update parseCollectionHttpResponse in entityStoreConfig, please';
const entityParseErrorMessage = '[NgrxRestApiStore][EntityCrudService] Could not parse http response. Define or update parseEntityHttpResponse in entityStoreConfig, please';

export class EntityCrudService<T> {

  entityStoreConfig: EntityStoreConfig;
  entityConfig: EntityConfig;

  constructor(
    protected entityName: string,
    protected partialEntityStoreConfig: EntityStoreConfig,
    protected httpClient: HttpClient
  ) {
    if (!partialEntityStoreConfig || !partialEntityStoreConfig.entities || !partialEntityStoreConfig.entities[entityName]) {
      throw new Error(`EntityStore: entity configuration for ${entityName} was not found. Add it, please`);
    }

    this.entityStoreConfig = {
      ...defaultEntityStoreConfig,
      ...partialEntityStoreConfig
    };

    this.entityConfig = {
      ...defaultEntityConfig,
      entityName,
      ...this.entityStoreConfig.entities[entityName]
    };

  }

  findAll$(filter?: any): Observable<EntityStorePage<T>> {

    return this.httpClient
      .get(`${this.getApiEndpoint()}${EntityCrudService.getQueryString(filter)}`, {observe: 'response'})
      .pipe(
        map(httpResponse => this.entityStoreConfig.parseCollectionHttpResponse(httpResponse, {filter})),
        mergeMap((entityStorePage: EntityStorePage<T>) => {
          if (!entityStorePage || !Array.isArray(entityStorePage.entities) || isNaN(+entityStorePage.totalEntities)) {
            return throwError(`${collectionParseErrorMessage} (${this.entityName})`);
          }
          return of(entityStorePage);
        }),
        catchError(EntityCrudService.onError)
      );
  }

  findByKey$(key: any, filter?: any): Observable<T> {

    return this.httpClient
      .get<T>(`${this.getApiEndpoint()}/${key}${EntityCrudService.getQueryString(filter)}`, {observe: 'response'})
      .pipe(
        mergeMap(httpResponse => {
          return this.processEntityHttpResponse(httpResponse, {key, filter});
        }),
        catchError(EntityCrudService.onError)
      );
  }

  save$(entity: T): Observable<T> {

    let obs$;

    if (entity['id']) {
      obs$ = this.httpClient.put(`${this.getApiEndpoint()}/${entity['id']}`, entity, {observe: 'response'});
    } else {
      obs$ = this.httpClient.post(`${this.getApiEndpoint()}`, entity, {observe: 'response'});
    }

    return obs$.pipe(
      mergeMap((httpResponse: HttpResponse<T>) => {
        return this.processEntityHttpResponse(httpResponse, {entity});
      }),
      catchError(EntityCrudService.onError)
    );
  }

  deleteByKey$(key: number, filter?: any): Observable<T> {
    return this.httpClient
      .delete(`${this.getApiEndpoint()}/${key}${EntityCrudService.getQueryString(filter)}`, {observe: 'response'})
      .pipe(
        mergeMap((httpResponse: HttpResponse<T>) => {
          return this.processEntityHttpResponse(httpResponse, {key, filter});
        }),
        catchError(EntityCrudService.onError)
      );
  }

  // === Utility functions =========================================================================================

  private processEntityHttpResponse(initialHttpResponse: HttpResponse<T>, params: any): Observable<T> {

    return of(initialHttpResponse)
      .pipe(
        catchError(EntityCrudService.onError),
        take(1),
        map(httpResponse => this.entityStoreConfig.parseEntityHttpResponse(httpResponse, params)),
        mergeMap((entity: T) => {
          if (!entity) {
            return throwError(`${entityParseErrorMessage} (${this.entityName})`);
          }
          return of(entity);
        })
      );

  }

  getApiEndpoint() {
    return `${this.entityStoreConfig.apiUrl}/${this.entityStoreConfig.entities[this.entityName].apiPath}`;
  }

  static getQueryString(query: any = null) {
    const queryString = qs.stringify(query);
    return ((queryString !== '') ? '?' : '') + queryString;
  }

  static onError(err) {
    return throwError(err);
  }

}
