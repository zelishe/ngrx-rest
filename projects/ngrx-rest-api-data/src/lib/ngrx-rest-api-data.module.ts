import { ModuleWithProviders, NgModule } from '@angular/core';
import { defaultEntityStoreConfig, EntityStoreConfig } from './models/entity-store-config';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
  ],
  imports: [
    HttpClientModule
  ],
  providers: [
  ]
})
export class NgrxRestApiDataModule {

  static forRoot(entityStoreConfig: EntityStoreConfig): ModuleWithProviders {

    entityStoreConfig = {
      ...defaultEntityStoreConfig,
      ...entityStoreConfig
    };

    return {
      ngModule: NgrxRestApiDataModule,
      providers: [
        { provide: EntityStoreConfig, useValue: entityStoreConfig }
      ]
    };
  }

}
