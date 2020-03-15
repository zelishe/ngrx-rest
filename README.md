# NgrxRestApiData

A practical reactive REST API data store for Angular and ngrx

* [Features](#Features)
* [Installation](#Installation)
* [Quickstart](#Quickstart)
* [Entity store structure](#EntityStoreStructure)
* [Dispatching requests to backend API](#DispatchingRequestsToBackendApi)
* [Configuration in details](#ConfigurationInDetails)

## <a id="Features"></a> Features

- Advanced REST API call status indication (loading, loaded, saving, saved, deleting, deleted) to give you full control over the data transfer process
- Simplified REST API call status via isBusy store property for those, who need a simplified solution
- Separated (but synchronized) state for the collection and the selected entity
- Separated status states for each entity in the collection
- totalElements for the collection to make your pagination easy
- apiFilter state to keep your filter form in a good shape 
- Easy API response post-processing - any response from your backend is acceptable 

## <a id="Installation"></a> Installation

#### npm
```shell script
    npm i --save ngrx-rest-api-data
```

#### yarn
```shell script
    yarn add ngrx-rest-api-data
```

## <a id="Quickstart"></a> Quickstart

Create a class for your entity. This class properties have to match the response from your API. For example, let's create a simple entity class for a Person 

```typescript
export class Person {
  id: number;
  firstName: string;
  lastName: string;
}
```
Create a basic configuration for ngrx-rest-api-data module, including EntityConfig for the Person

```typescript
const entityStoreConfig: EntityStoreConfig = {
  apiUrl: 'http://your-api-url.com/api',
  entities: {
    Person: {
      storeKey: 'persons',
      apiPath: 'persons'
    }
  }
};

export default entityStoreConfig;
```

Add NgrxRestApiModule to your Angular application. Don't forget to import HttpClientModule (@angular/http) and StoreModule (@ngrx/store)

```typescript
import { NgrxRestApiDataModule } from 'ngrx-rest-api-data';
import entityStoreConfig from '../../shared/entity-store-config';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    StoreModule.forRoot({}),
    NgrxRestApiDataModule.forRoot(entityStoreConfig)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
```  

Create a service to work with your Person entity.

```typescript
import { Person } from './person';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { EntityStoreService } from 'ngrx-rest-api-data';

import entityStoreConfig from '../../shared/entity-store-config';

@Injectable()
export class PersonService extends EntityStoreService<Person> {

  constructor(
    protected httpClient: HttpClient,
    protected store: Store<any>
  ) {
    super('Person', entityStoreConfig, httpClient, store);
  }
}
```

Update entity store configuration to parse collection responses. In almost all cases your API response for the collection will differ from project to project.
This is why you must define parseCollectionHttpResponse (and parseEntityHttpResponse, if you need this as well) in the configuration.

```typescript
const entityStoreConfig = {
  apiUrl: environment.apiUrl,
  entities: {
    Order: {
      storeKey: 'orders',
      apiPath: 'orders'
    },
    AssetPair: {
      storeKey: 'assetPairs',
      apiPath: 'asset-pairs'
    }
  },
  parseCollectionHttpResponse(httpResponse: HttpResponse<object>, params: any): EntityStorePage<object> {
    return {
      entities: httpResponse.body['content'],
      totalElements: httpResponse.body['totalElements']
    };
  }
};

export default entityStoreConfig
```

## <a id="EntityStoreStructure"></a> Entity store structure

Each entity store is put as a root element into the global Ngrx state under storeKey put into EntityConfig object.
In our case, it is "appState.orders" of EntityStoreState type.

#### EntityStoreState

**selectedEntity** : EntityState

This is where the result of *single* entity API calls (such as findByKey, save or deleteByKey) go to

**collection** : EntityCollectionState

This is where the result of *collection* API calls (such as findAll) go to

---
#### EntityCollectionState

**status** : string (values = 'initial', 'loading', 'loaded', 'error')

The current status of collection. No batch save functionality for now on.

**isBusy** : boolean

Simplified status of the collection. This will be used, when we will add batch save and delete.

**apiFilter** : any

When you request findAll(filter) with some filter, this object will be stored in this part of the state. It is useful to manipulate your filter form, for example.

**entityStates** : EntityState<T>[];

Each entity in the collection has it's own separate state, stored in this array. Access to entities themselves is done through this array as well. 

**totalEntities** : number

Amount of **total** entities in the collection on the backend. This can be used for pagination.

**error** : any

Any errors returned from backed API will be stored here. API response with an error will switch collection to "not-busy, has an error" (isBusy: false, status: 'error'). 
You can enable a filter form in case of an error, for example.

---

#### EntityState

**status** : string (values = 'initial', 'loading', 'loaded', 'saving', 'saved', 'deleting', 'deleted', 'error')

The current status of the entity. You have very strong control over what state the entity is in, as you see.

**isBusy** : boolean

Simplified status of an entity. Reacts on get, save and delete.

**entity** : T

The actual entity data provided in service type T.

**error** : any

Any errors returned from backed API will be stored here. API response with an error will switch collection to "not-busy, has an error" (isBusy: false, status: 'error'). 
You can enable the entity edit form in case of an error, for example.

## <a id="DispatchingRequestsToBackendApi"></a> Dispatching requests to backend API

### Sending and receiving data from/to the backend

Each of your entity services have the following methods to request data manipulations.

**findAll(filter: any)** 

Request: GET + {apiUr}l/{apiPath}?filterParam1=x&filterParam2=y 

This method retrieves collection data from the backend API

 - After busyIndicationDelay has passed and if data has not yet arrived entityStoreState.collection switches to { isBusy: true, status: 'loading' }
 - Server response is processed by parseCollectionHttpResponse
 - Server response is put into updates the "collection.entityStates" part of the appropriate EntityStoreState.
 - Each entityState has { isBusy: false, status: 'loaded' }
 - Total amount of entities is put into "collections.totalEntities" or the appropriate EntityStoreState.
 - entityStoreState.collection switches to { isBusy: false, status: 'loaded' }

**findByKey(key: number | string)**

Request: GET + {apiUrl}/{apiPath}/{key} 

This method retrieves one entity by it's key (usually it's "id") from the backend.

 - After busyIndicationDelay has passed and if data has not yet arrived entityStoreState.selectedEntity switches to { isBusy: true, status: 'loading' }
 - Server response is processed by parseEntityHttpResponse
 - Server response is put into updates the "selectedEntity" part of the appropriate EntityStoreState.
 - selectedEntity is switched to { isBusy: false, status: 'loaded' }
 - **IMPORTANT** if this entity is present in the "collection" part of the state, it will be updated there as well, including a switch to 'loading' status
 - **IMPORTANT** if this entity is NOT present in collection part of the state, it will not be added to collection

**save(entity: T)**

Request: POST + {apiUrl}/{apiPath} 
Request: PUT + {apiUrl}/{apiPath}/{key}

This method sends POST or PUT request to save entity data on the backend

 - After busyIndicationDelay has passed and if data has not yet arrived entityStoreState.selectedEntity switches to { isBusy: true, status: 'saving' }
 - Server response is processed by parseEntityHttpResponse
 - Server response is put into updates the "selectedEntity" part of the appropriate EntityStoreState.
 - selectedEntity is switched to { isBusy: false, status: 'saved' }
 - **IMPORTANT** if this entity is present in collection part of the state, it will be updated there as well, including a switch to 'saving' status
 - **IMPORTANT** if this entity is NOT present in collection part of the state, it's not added to collection

**deleteByKey(key: any)**

Request: DELETE + {apiUrl}/{apiPath}/{key}

 - After busyIndicationDelay has passed and if data has not yet arrived entityStoreState.selectedEntity switches to { isBusy: true, status: 'deleting' }
 - Server response is processed by parseEntityHttpResponse
 - Server response is put into updates the "selectedEntity" part of the appropriate EntityStoreState.
 - selectedEntity is switched to { isBusy: false, status: 'saved' }
 - **IMPORTANT** If this entity is present in "collection" part of the state, it will be removed from there as well. That entity state will also switch to 'deleting' status, when appropriate event will be fired.

### Displaying the data

You can subscribe to built-in observables to display the data from the store in a reactive way.

#### selectedEntity

**selectedEntity$** : T 

Shortcut to ``appState.yourEntityStore.selectedEntity.entity`` 

The main observable you'll be working with, it emits the entity you've requested to load, save or delete.

**selectedEntityState$** : EntityState

Shortcut to ``appState.yourEntityStore.selectedEntity`` 

Use it, if you need access to "everything about the entity".

**selectedEntityIsBusy$** : boolean

Shortcut to ``appState.yourEntityStore.selectedEntity.isBusy`` 

Use it, if you need to create a simple loading indication.

**selectedEntityStatus$** : string

Shortcut to ``appState.yourEntityStore.selectedEntity.status`` 

Use it, if you need to create a separated loading indication for load/save statuses. 

**selectedEntityError$** : any 

Shortcut to ``appState.yourEntityStore.selectedEntity.error`` 

Use it, if you need to unlock the entity edit form on backend error and provide some error indication.

---

#### collection

**entities$** : T[] 

Shortcut to ``appState.yourEntityStore.collection.entityStates.map(entityState => entityState.entity)`` 

The main observable you'll be working with, this is a shortcut with all the entities in the collection.

**entityStates$** : EntityState[] 

Shortcut to ``appState.yourEntityStore.collection.entitityStates`` 

Use it, if you need the access to "everything about the collection entities states". Useful, if you have a table of entities and want to save (and show the indication) one of those.

**collection$** : EntityCollectionState

Shortcut to ``appState.yourEntityStore.collection`` 

Use it, if you need the access to "everything about the collection"

**totalEntities$** : number

Shortcut to ``appState.yourEntityStore.collection.totalEntities`` 

Use it, if you need to put "total records found" number on your component. 

**collectionIsBusy$** : boolean

Shortcut to ``appState.yourEnityStore.collection.isBusy`` 

Use it, if you need to create a simple collection loading animation.

**collectionStatus$** : string

Shortcut to ``appState.yourEntityStore.collection.status`` 

Use it, if you need to create a separated loading indication for load/save statuses.

**collectionError$** : any

Shortcut to ``appState.youEntityStore.collection.error`` 

Use it, if you need to unlock the entity edit form on backend error and provide some error indication.

--- 

You can access any part of the state by using the usual ngrx select method.

```typescript
    const personEntityStates$     = this.store.select(appState => appState.persons.collection.entityStates);
    const personCollectionStatus$ = this.store.select(appState => appState.persons.collection.status);
```


## <a id="ConfigurationInDetails"></a> Configuration in details

#### EntityStoreConfig

**apiUrl** : string

The root URL to access your backend REST API. Entity resources will be accessed via {apiUrl}/{apiPath}, where apiPath is a property of EntityConfig

**busyIndicationDelay** : number = 300

**entities** : object

The keys of this object must match your model class names (Order, Person, etc.) and the value is an EntityConfig, providing all the information on how to manage this entity.

**parseCollectionHttpResponse** : function(httpResponse: HttpResponse, params: any)

This function takes raw HttpResponse object directly from httpClient and must provide an EntityPage instead.
In most of the real-world cases, you will have your unique response to get the collection from the backend API. 
By default, it returns httpResponse.body, which is suitable for a limited amount of cases.

**parseEntityHttpResponse** : function(httpResponse: HttpResponse, params: any)

This function takes raw HttpResponse object directly from httpClient and must provide an entity instance in response.
In most of the real-world cases your API will return a JSON with the entity, but if you have something specific - use this function to parse the response.


By default, it returns httpResponse.body, which is suitable for most of the cases.

---

#### EntityConfig

**entityName** : string

Entity name must be the same, as the name of your entity class

**apiPath** : string

Entity resources will be accessed via {apiUrl}/{apiPath}, where apiUrl is a property of EntityStoreConfig 

**storeKey** : string 

The key in ngrx Store, where your EntityState instance will be put to.
Unfortunately, all your entity stores will be registered at ngrx Store root. There is no way to make some sub-object at the moment.

**keyProperty** string = "id"

The key property name in your entities. Typically it is "id", but we want to give you the flexibility on this.

---

#### EntityStorePage

**entities** : T[]

The array of entities, which will be put into your store collection,

**totalEntities** : number

Amount of *total* entities in the collection on the backend. This can be used for pagination.

## Why not @ngrx/data?

We admire the effort and time being put into that now official part of ngrx, but @ngrx/data solution is not flexible and developer-friendly enough for our projects. 

## Feedback

Please [leave your feedback](https://github.com/zelishe/ngrx-rest-api-data/issues) if you notice any issues or have a feature request.

## Licence

The repository code is open-source software licensed under the [MIT license](http://opensource.org/licenses/MIT).
