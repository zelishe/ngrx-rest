import { createAction, createReducer, on, props, select, Store } from '@ngrx/store';
import { EntityStoreConfig } from '../models/entity-store-config';
import { EntityCrudService } from './entity-crud.service';
import { catchError, delay, filter, map, startWith, take, tap } from 'rxjs/operators';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { EntityCollectionState, EntityState, EntityStoreState } from '../models/entity-state';
import { EntityStorePage } from '../models/entity-store-page';
import deepEqual from 'deep-equal';
import { HttpClient } from '@angular/common/http';

export const SUB_STORE_KEY_SELECTED_ENTITY = 'selectedEntity';
export const SUB_STORE_KEY_ENTITIES = 'entities';

export const ENTITY_STORE_STATUS_INITIAL = 'initial';
export const ENTITY_STORE_STATUS_LOADING = 'loading';
export const ENTITY_STORE_STATUS_LOADED = 'loaded';
export const ENTITY_STORE_STATUS_SAVING = 'saving';
export const ENTITY_STORE_STATUS_SAVED = 'saved';
export const ENTITY_STORE_STATUS_DELETING = 'deleting';
export const ENTITY_STORE_STATUS_DELETED = 'deleted';
export const ENTITY_STORE_STATUS_ERROR = 'error';

export class EntityStoreService<T> extends EntityCrudService<T> {

  selectedEntity$: Observable<T>;
  selectedEntityState$: Observable<EntityState<T>>;
  selectedEntityStatus$: Observable<string>;
  selectedEntityIsBusy$: Observable<boolean>;
  selectedEntityError$: Observable<any>;

  apiFilter$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  entities$: Observable<T[]>;
  entityStates$: Observable<EntityState<T>[]>;
  collection$: Observable<EntityCollectionState<T>>;
  totalEntities$: Observable<number>;
  collectionIsBusy$: Observable<boolean>;
  collectionStatus$: Observable<string>;
  collectionError$: Observable<any>;

  initialState: EntityStoreState<T> = {
    selectedEntity: {
      status: ENTITY_STORE_STATUS_INITIAL,
      isBusy: false,
      entity: null,
      error: null
    },
    collection: {
      status: ENTITY_STORE_STATUS_INITIAL,
      isBusy: false,
      apiFilter: null,
      entityStates: [],
      totalEntities: 0,
      error: null
    }
  };

  actions: {
    [key: string]: any,

    setEntities?,
    findAll?,
    setEntitiesBusyIndication?,
    setEntitiesError?,

    setSelectedEntity?,
    findByKey?,
    save?,
    onAfterSave?,
    deleteByKey?,
    onAfterDeleteByKey?,
    setSelectedEntityBusyIndication?
    setSelectedEntityError?
  } = {};

  constructor(
    protected entityName: string,
    protected partialEntityStoreConfig: EntityStoreConfig,
    protected httpClient: HttpClient,
    protected store: Store<any>
  ) {
    super(entityName, partialEntityStoreConfig, httpClient);

    this.createActions();
    this.createReducer();
    this.createSelectors();
  }

  createActions(additionalActions = {}) {

    this.actions = {
      setEntities: createAction(`[EntityStore][${this.entityName}] setEntities`, props<{ entities: T[], totalEntities: number, status: string }>()),
      findAll: createAction(`[EntityStore][${this.entityName}] findAll`, props<{ apiFilter: any }>()),
      setEntitiesBusyIndication: createAction(`[EntityStore][${this.entityName}] setEntitiesBusyIndication`, props<{ isBusy: boolean, status: string }>()),
      setEntitiesError: createAction(`[EntityStore][${this.entityName}] setEntitiesError`, props<{ error: any }>()),

      setApiFilter: createAction(`[EntityStore][${this.entityName}] setApiFilter`, props<{ apiFilter: any }>()),
      setSelectedEntity: createAction(`[EntityStore][${this.entityName}] setSelectedEntity`, props<{ entity: T, status: string }>()),
      findByKey: createAction(`[EntityStore][${this.entityName}] findByKey`, props<{ key: number | string, filter?: any }>()),
      save: createAction(`[EntityStore][${this.entityName}] save`, props<{ entity: T }>()),
      onAfterSave: createAction(`[EntityStore][${this.entityName}] onAfterSave`, props<{ entity: T }>()),
      deleteByKey: createAction(`[EntityStore][${this.entityName}] deleteByKey`, props<{ key: any, filter?: any }>()),
      onAfterDeleteByKey: createAction(`[EntityStore][${this.entityName}] onAfterDeleteByKey`, props<{ entity: T }>()),
      setSelectedEntityBusyIndication: createAction(`[EntityStore][${this.entityName}] setSelectedEntityBusyIndication`, props<{ isBusy: boolean, status: string, key?: any }>()),
      setSelectedEntityError: createAction(`[EntityStore][${this.entityName}] setSelectedEntityError`, props<{ error: any }>()),
      ...additionalActions
    };

  }

  createReducer(additionalOns = []) {

    // NB! We don't use @ngrx/effects, because RIGHT NOW there is no way to create effect dynamically and attach it to the app
    // (like store.addReducer() for example). If this functionality will be added to @ngrx - it's time to switch to effects from
    // dispatching an action after HTTP-request was done

    const entityStoreReducer = createReducer(
      this.initialState,
      on(this.actions.setEntities, this.onSetEntities.bind(this)),
      on(this.actions.setEntitiesBusyIndication, this.onSetEntitiesBusyIndication.bind(this)),
      on(this.actions.findAll, this.onFindAll.bind(this)),
      on(this.actions.setEntitiesError, this.onSetEntitiesError.bind(this)),

      on(this.actions.setApiFilter, this.onSetApiFilter.bind(this)),
      on(this.actions.setSelectedEntity, this.onSetSelectedEntity.bind(this)),
      on(this.actions.findByKey, this.onFindByKey.bind(this)),
      on(this.actions.save, this.onSave.bind(this)),
      on(this.actions.onAfterSave, this.onAfterSave.bind(this)),
      on(this.actions.deleteByKey, this.onDeleteByKey.bind(this)),
      on(this.actions.onAfterDeleteByKey, this.onAfterDeleteByKey.bind(this)),
      on(this.actions.setSelectedEntityBusyIndication, this.onSetSelectedEntityBusyIndication.bind(this)),
      on(this.actions.setSelectedEntityError, this.onSetSelectedEntityError.bind(this)),
      ...additionalOns
    );

    this.store.addReducer(this.entityConfig.storeKey, entityStoreReducer);

  }

  private createSelectors() {

    const storeKey = this.entityConfig.storeKey;

    this.selectedEntityState$ = this.store.select(appState => appState[storeKey].selectedEntity);
    this.selectedEntity$ = this.store.select(appState => appState[storeKey].selectedEntity.entity);
    this.selectedEntityIsBusy$ = this.store.select(appState => appState[storeKey].selectedEntity.isBusy);
    this.selectedEntityStatus$ = this.store.select(appState => appState[storeKey].selectedEntity.status);
    this.selectedEntityError$ = this.store.select(appState => appState[storeKey].selectedEntity.error);

    this.apiFilter$ = this.convertObservableToBehaviorSubject<any>(
      this.store.select(appState => appState[storeKey].collection.apiFilter),
      null
    );

    this.entities$ = this.store.pipe(
      select(appState => appState[storeKey].collection.entityStates),
      map(entityStates => {
        return entityStates.map(entityState => entityState.entity);
      })
    );
    this.entityStates$ = this.store.select(appState => appState[storeKey].collection.entityStates);
    this.collection$ = this.store.select(appState => appState[storeKey].collection);
    this.totalEntities$ = this.store.select(appState => appState[storeKey].collection.totalEntities);
    this.collectionIsBusy$ = this.store.select(appState => appState[storeKey].collection.isBusy);
    this.collectionStatus$ = this.store.select(appState => appState[storeKey].collection.status);
    this.collectionError$ = this.store.select(appState => appState[storeKey].collection.error);

  }

  // =================================================================================================================
  // === Actions dispatchers =========================================================================================
  // =================================================================================================================

  setEntities(entities?: T[], status: string = ENTITY_STORE_STATUS_LOADED) {

    this.store.dispatch(this.actions.setEntities({
      entities,
      totalEntities: entities.length,
      status
    }))
  }

  findAll(apiFilter?: any) {
    this.store.dispatch(this.actions.findAll({apiFilter}));
  }

  reloadAll() {
    this.store.dispatch(
      this.actions.findAll({
        apiFilter: this.apiFilter$.getValue()
      })
    );
  }

  findByKey(key: number | string) {
    this.store.dispatch(this.actions.findByKey({key}));
  }

  public setSelectedEntity(entity: T, status = ENTITY_STORE_STATUS_LOADED) {
    this.store.dispatch(this.actions.setSelectedEntity({entity, status}));
  }

  public save(entity: T) {
    this.store.dispatch(this.actions.save({entity}));
  }

  public deleteByKey(key: any, filter?: any) {
    this.store.dispatch(this.actions.deleteByKey({key, filter}));
  }

  // =================================================================================================================
  // === API call triggering actions =================================================================================
  // =================================================================================================================

  private onFindAll(state, actionProps: { apiFilter: any, type: string }) {

    this.constructApiCall$(SUB_STORE_KEY_ENTITIES, this.findAll$(actionProps.apiFilter), ENTITY_STORE_STATUS_LOADING)
      .subscribe((entityStorePage: EntityStorePage<T>) => {
        this.store.dispatch(this.actions.setEntities({
          entities: entityStorePage.entities,
          totalEntities: entityStorePage.totalEntities,
          status: ENTITY_STORE_STATUS_LOADED
        }));
      });

    // We are setting apiFilter right away, but the status / isBusy indication will be
    // triggered in constructApiCall$ depending on delay set in entityStoreConfig.busyIndicationDelay
    this.store.dispatch(this.actions.setApiFilter({apiFilter: actionProps.apiFilter}))

    return state;
  }

  private onFindByKey(state, actionProps: { key: number | string, filter?: any }) {

    this.constructApiCall$(SUB_STORE_KEY_SELECTED_ENTITY, this.findByKey$(actionProps.key, actionProps.filter), ENTITY_STORE_STATUS_LOADING, actionProps.key)
      .subscribe(entity => {
        this.store.dispatch(this.actions.setSelectedEntity({
          entity,
          status: ENTITY_STORE_STATUS_LOADED
        }));
      });

    return {...state};

  }

  private onSave(state, actionProps: { entity: T }) {

    const key = (actionProps.entity[this.entityConfig.keyProperty]) ? actionProps.entity[this.entityConfig.keyProperty] : null;

    this.constructApiCall$(SUB_STORE_KEY_SELECTED_ENTITY, this.save$(actionProps.entity), ENTITY_STORE_STATUS_SAVING, key)
      .subscribe((entity: T) => {
        this.store.dispatch(this.actions.onAfterSave({entity}));
      });

    return {...state};
  }

  private onDeleteByKey(state, actionProps: { key: any, filter?: any }) {

    this.constructApiCall$(
      SUB_STORE_KEY_SELECTED_ENTITY,
      this.deleteByKey$(actionProps.key, actionProps.filter),
      ENTITY_STORE_STATUS_DELETING,
      actionProps.key
    )
      .subscribe((entity: T) => {
        this.store.dispatch(this.actions.onAfterDeleteByKey({entity}));
      });

    return {...state};
  }

  // ==================================================================================================================
  // === API response processing actions ==============================================================================
  // ==================================================================================================================

  onSetEntities(state, actionProps: { entities: T[], totalEntities: number, status: string }) {

    if (!actionProps.entities) {
      actionProps.entities = [];
    }

    return {
      ...state,
      collection: {
        ...state.collection,
        isBusy: false,
        status: actionProps.status,
        entityStates: actionProps.entities.map(entity => {
          return {
            isBusy: false,
            status: actionProps.status,
            error: null,
            entity
          } as EntityState<T>;
        }),
        totalEntities: actionProps.totalEntities
      }
    };

  }

  onSetEntitiesBusyIndication(state, actionProps: { isBusy: boolean, status: string }) {

    return {
      ...state,
      collection: {
        ...state.collection,
        isBusy: actionProps.isBusy,
        status: actionProps.status
      }
    };

  }


  onSetEntitiesError(state, actionProps: { error: any }) {

    return {
      ...state,
      collection: {
        ...state.collection,
        isBusy: false,
        status: ENTITY_STORE_STATUS_ERROR,
        error: actionProps.error
      }
    };

  }

  onSetApiFilter(state, actionProps: { apiFilter: any }) {
    return {
      ...state,
      collection: {
        ...state.collection,
        apiFilter: actionProps.apiFilter
      }
    };
  }

  onSetSelectedEntity(state, actionProps: { entity: T, status: string }) {

    const updatedEntityState = {
      ...state.selectedEntity,
      isBusy: false,
      status: actionProps.status,
      entity: actionProps.entity,
      error: null
    };

    return {
      ...state,
      selectedEntity: updatedEntityState,
      collection: this.updateEntityStateInCollection(state.collection, updatedEntityState)
    };

  }

  onSetSelectedEntityError(state, actionProps: { error: any }) {

    return {
      ...state,
      selectedEntity: {
        ...state.selectedEntity,
        isBusy: false,
        status: ENTITY_STORE_STATUS_ERROR,
        error: actionProps.error
      }
    };

  }

  onSetSelectedEntityBusyIndication(state, actionProps: { isBusy: boolean, status: string, key: any }) {

    const updatedEntityState = {
      ...state.selectedEntity,
      isBusy: actionProps.isBusy,
      status: actionProps.status,
      error: null
    };

    return {
      ...state,
      selectedEntity: updatedEntityState,
      collection: this.updateEntityStateInCollection(state.collection, updatedEntityState)
    };

  }

  private onAfterSave(state, actionProps: { entity: T }) {

    const keyProperty = this.entityConfig.keyProperty;

    const updatedState = {...state};

    const updatedEntityState = {
      isBusy: false,
      status: ENTITY_STORE_STATUS_SAVED,
      entity: actionProps.entity,
      error: null
    };

    if (!state.selectedEntity.entity || state.selectedEntity.entity[keyProperty] === actionProps.entity[keyProperty]) {
      updatedState.selectedEntity = updatedEntityState;
    }

    updatedState.collection = this.updateEntityStateInCollection(state.collection, updatedEntityState);

    return updatedState;
  }

  private onAfterDeleteByKey(state, actionProps: { entity: T }) {

    const keyProperty = this.entityConfig.keyProperty;

    const updatedState = {...state};

    // We trigger "deleted" status only if this entity was previously selected and keys matching
    if (state.selectedEntity.entity && state.selectedEntity.entity[keyProperty] === actionProps.entity[keyProperty]) {
      updatedState.selectedEntity = {
        ...state.selectedEntity,
        entity: actionProps.entity,
        isBusy: false,
        status: ENTITY_STORE_STATUS_DELETED,
        error: null
      };
    }

    // Removing deleted entity from state.entityStates, if it's found there
    const existingEntityIndex = updatedState.collection.entityStates.findIndex(entityState => entityState.entity[keyProperty] === actionProps.entity[keyProperty]);
    if (existingEntityIndex !== -1) {
      const updatedCollection = {...state.collection};
      const updatedEntityStates = [ ...updatedCollection.entityStates ];
      updatedEntityStates.splice(existingEntityIndex, 1);
      updatedState.collection = {
        ...updatedCollection,
        entityStates: updatedEntityStates,
        totalEntities: updatedState.collection.totalEntities - 1
      };
    }

    return updatedState;
  }

  private updateEntityStateInCollection(collection: EntityCollectionState<T>, updatedEntityState: EntityState<T>): EntityCollectionState<T> {

    const keyProperty = this.entityConfig.keyProperty;

    if (updatedEntityState.entity && updatedEntityState.entity[keyProperty] && collection && collection.entityStates) {

      const existingEntityIndex = collection.entityStates.findIndex(entityState => entityState.entity[keyProperty] === updatedEntityState.entity[keyProperty]);

      // We require deep equal comparison here to understand, do we need to update that entity in collection or not
      // If we DO update the entity in collection, then the entities$ observable will be triggered
      if (existingEntityIndex !== -1 && !deepEqual(collection.entityStates[existingEntityIndex], updatedEntityState)) {
        const updatedCollection = {...collection};
        const updatedEntityStates = [ ...updatedCollection.entityStates ];
        updatedEntityStates[existingEntityIndex] = updatedEntityState;
        return {
          ...updatedCollection,
          entityStates: updatedEntityStates
        };
      }
    }

    return collection;
  }

  private constructApiCall$(
    subStoreKey: string,
    apiCall$: Observable<any>,
    busyStatus: string,
    entityKey?: any
  ) {

    let setContentAction;
    let setBusyIndicationAction;
    let setErrorAction;

    switch (subStoreKey) {
      case SUB_STORE_KEY_ENTITIES:
        setContentAction = this.actions.setEntities;
        setBusyIndicationAction = this.actions.setEntitiesBusyIndication;
        setErrorAction = this.actions.setEntitiesError;
        break;
      case SUB_STORE_KEY_SELECTED_ENTITY:
        setContentAction = this.actions.setSelectedEntity;
        setBusyIndicationAction = this.actions.setSelectedEntityBusyIndication;
        setErrorAction = this.actions.setSelectedEntityError;
        break;
    }

    return combineLatest([
      of(true).pipe(delay(this.entityStoreConfig.busyIndicationDelay), startWith(false)),
      apiCall$.pipe(startWith<any, any>(null))
    ])
      .pipe(
        map(([ busyIndicationDelayStatus, responseData ]) => {

          if (responseData) {
            return responseData;
          }

          // If API-query takes longer than "busyIndicationDelay" - fire up "show the busy indicator" event
          if (busyIndicationDelayStatus && !responseData) {
            this.store.dispatch(setBusyIndicationAction({isBusy: true, status: busyStatus, key: entityKey}));
          }

          return null;

        }),
        catchError(error => {
          this.store.dispatch(setErrorAction({error}));
          return null;
        }),
        filter(responseData => !!responseData),  // We pass only valid data with response (we don't care about indicationDelay)
        take(1)                                     // We pass only 1 valid data response (2nd will be triggered with { busyIndicationStatus: true, responseData: [] }, we don't need it
      );

  }

  private convertObservableToBehaviorSubject<T>(observable: Observable<T>, initValue: T): BehaviorSubject<T> {
    const subject = new BehaviorSubject(initValue);

    observable.subscribe({
      complete: () => subject.complete(),
      error: error => subject.error(error),
      next: x => subject.next(x)
    });

    return subject;
  }

}
