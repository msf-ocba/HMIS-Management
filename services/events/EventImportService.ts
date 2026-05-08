/*
 Copyright (c) 2015.

 This file is part of Project Manager.

 Project Manager is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 Project Manager is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with Project Manager.  If not, see <http://www.gnu.org/licenses/>. */

import { CommonVariable, EventDataWrapper, Program, TrackedEntityInstanceList } from '../../model/model';
import { EventHelper, ProgramService } from '../services.module';
var EncUTF8 = require('crypto-js/enc-utf8');

export class EventImportService {

    static $inject =["$q", "$http", "$rootScope", "commonvariable", "EventHelper", "ProgramService"];
    
    constructor(
        private $q: ng.IQService,
        private $http, 
        private $rootScope,
        private commonvariable: CommonVariable,
        private EventHelper: EventHelper, 
        private ProgramService: ProgramService
       
        ){}
    /*
    importEventFile (file) {
        // It is required to wrap the return into a deferred object. If not, the following promises are not notified
        var deferred = this.$q.defer();
        this.readEventZipFile(file).then( 
            (eventFile: EventDataWrapper) => {
                return this.getAndUploadTeis(eventFile)
                    .then( () => this.getAndUploadEnrollmentsAsActive(eventFile) )
                    .then( () => this.getAndUploadDeletedEvents(eventFile) )
                    .then( () => this.getAndUploadActiveEvents(eventFile) )
                    .then( () => this.getAndUploadEnrollments(eventFile) )
                    .then(
                        () => deferred.resolve("Done"),
                        (error) => deferred.reject(error)
                );
            },
            (error) => deferred.reject("The file does not contain event data.")
        );
        return deferred.promise;
    };
  */  
    importEventFile2 (file) {
       
        // It is required to wrap the return into a deferred object. If not, the following promises are not notified
        var deferred = this.$q.defer();
        this.readEventZipFile(file).then( 
            (eventFile) => {
                console.log("EventFile");
                console.log(eventFile);
                return this.getAndUploadTeis2(eventFile.content)
                
                   // .then( () => this.getAndUploadEnrollmentsAsActive(eventFile) )
                  //  .then( () => this.getAndUploadDeletedEvents(eventFile) )
                  //  .then( () => this.getAndUploadActiveEvents(eventFile) )
                  //  .then( () => this.getAndUploadEnrollments(eventFile) )
                    .then(
                        (data) => deferred.resolve({"data":data, "settings":eventFile.settings}),
                        (error) => deferred.reject(error)
                );
            },
            (error) => deferred.reject("The file does not contain event data.")
        );
        return deferred.promise;
    };


    private readZipFile (file): Promise<JSZip> {
        return (new JSZip()).loadAsync(file)
    }

     readEventZipFile (file): Promise<any> {
        return this.readZipFile(file).then( (content) => {

            var encryptedFile = content.file(this.EventHelper.TEIS);
            var settings=content.file("settings");
            var settingsResult;
            var contentResult;
            if (encryptedFile == undefined) {
                return this.$q.reject("No events file");
            } 
          
          return  settings.async("string").then(e=>{
            settingsResult=JSON.parse(e.toString(EncUTF8));
            }).then(() => {
               // console.log("settings");
               // console.log(settingsResult);
               return encryptedFile.async("string")
            }).then (enc =>{

                contentResult= JSON.parse(enc.toString(EncUTF8))
            }).then(()=>{
                //console.log("contentResult");
                //console.log(contentResult);

                return   this.EventHelper.decryptObject(contentResult);
                
                
            })
            
             
            
               .then(decrpyted => 
                {

                console.log("decrpyted");
                console.log(decrpyted);
                return {"settings": settingsResult, "content":decrpyted};
              
                }
            );
        });
    }
/*
    private getAndUploadTeis (content: EventDataWrapper) {
        const teis = new Object();
        teis[this.EventHelper.TEIS] = content[this.EventHelper.TEIS];
        const params = { strategy: 'CREATE_AND_UPDATE'}
        return this.zipObject(this.EventHelper.TEIS, teis)
            .then( (data) => this.uploadFile(this.EventHelper.TEIS, data, params) );
    }
*/
   private async getAndUploadTeis2 (content) {
//var hasErrors = false;        
//    console.log("CONTENT");
//    console.log(JSON.stringify(content));
    var teis = content.trackedEntities;

    const paramsDeleted = { importStrategy: 'DELETE',async: false};
    const paramsUpdated = { importStrategy: 'CREATE_AND_UPDATE', async: false};
        
    var numberTeis=teis.length;
    this.$rootScope.$broadcast('numberTeisOk',numberTeis);

    var resultAll={
        "numberTeis":numberTeis,
        "updated":0,
        "deleted":0,
        "imported":0,
        "ignored":0,
        "hasErrors": false,
    "errors": [],
    "TEIS": [],
   
    message: ""
        
     };

    console.log("Number of TEIS:"+ numberTeis);
      
    for (var tei in teis)  {
            
        this.$rootScope.$broadcast('numTeiOk',tei);

        var currentTei = teis[tei];

        console.log("Importing TEI ("+tei+"/"+numberTeis+"):"+currentTei.trackedEntity);

        // 🔴 Payload de borrado por TEI
        var deletePayload = {
            trackedEntities: [],
            enrollments: [],
            events: []
        };

        // 🔴 Si el TEI está borrado → solo DELETE
        if (currentTei.deleted) {

            deletePayload.trackedEntities.push({
                trackedEntity: currentTei.trackedEntity
            });

        } else {

            // 🟢 Construir TEI limpio
            var cleanTei = Object.assign({}, currentTei);
            //delete cleanTei.deleted;
            cleanTei.enrollments = [];

            if (currentTei.enrollments != undefined) {

                currentTei.enrollments.forEach(enrollment => {

                    // 🔴 Enrollment a borrar
                    if (enrollment.deleted) {
                        deletePayload.enrollments.push({
                            enrollment: enrollment.enrollment
                        });
                        return;
                    }

                    var cleanEnrollment = Object.assign({}, enrollment);
                    //delete cleanEnrollment.deleted;
                    cleanEnrollment.events = [];

                    if (enrollment.events != undefined) {

                        enrollment.events.forEach(event => {

                            // 🔴 Evento a borrar
                            if (event.deleted) {
                                deletePayload.events.push({
                                    event: event.event
                                });
                                return;
                            }

                            // 🟢 Evento limpio
                            var cleanEvent = Object.assign({}, event);
                            //delete cleanEvent.deleted;

                            // mantener tu lógica original
                            if (cleanEvent.notes!=undefined && cleanEvent.notes.length>0 ) { 
                                cleanEvent.notes=[];
                            }

                            cleanEnrollment.events.push(cleanEvent);
                        });
                    }

                    cleanTei.enrollments.push(cleanEnrollment);
                });
            }

         try {
   
            // 🚀 CREATE / UPDATE
            var tei2={"trackedEntities":[cleanTei]};
            //var data= await this.zipObject(this.EventHelper.TEIS, tei2);
  
           // var result= await this.uploadFile(this.EventHelper.TEIS, data, paramsUpdated);

            var result = await this.uploadJson("tracker", tei2, paramsUpdated);
            
            console.log("Result: "+result.data.message);
            console.log(result.data);

            var typeReportMap = result.data.bundleReport.typeReportMap || {};

resultAll.updated += typeReportMap.TRACKED_ENTITY.stats.updated|| 0;
resultAll.imported += typeReportMap.TRACKED_ENTITY.stats.imported || 0;

//resultAll.imported += (stats.created || stats.imported || 0);
//resultAll.deleted += stats.deleted || 0;
resultAll.ignored += typeReportMap.TRACKED_ENTITY.stats.ignored || 0;
/*
            resultAll.updated +=result.data.response.updated;
            resultAll.imported +=result.data.response.imported;
            resultAll.deleted +=result.data.response.deleted;
            resultAll.ignored +=result.data.response.ignored;
*/
            var t={
                "uid": currentTei.trackedEntity,
                "result": result.data
            };

            resultAll.TEIS.push(t);
} catch (error) {

    console.error("UPDATE ERROR TEI:", currentTei.trackedEntity, error);
 resultAll.hasErrors = true;
    resultAll.errors.push({
        uid: currentTei.trackedEntity,
        type: "UPDATE",
        message: (error && error.data && error.data.message)
    || (error && error.message)
    || "Error"
    });

    resultAll.TEIS.push({
        uid: currentTei.trackedEntity,
        type: "ERROR",
        error: (error && error.data) || (error && error.message) || "Error"
    });
}

        }

        // 🚀 DELETE (si hay algo que borrar)
        if (
            deletePayload.trackedEntities.length > 0 ||
            deletePayload.enrollments.length > 0 ||
            deletePayload.events.length > 0
        ) {

            //var dataDelete = await this.zipObject(this.EventHelper.TEIS, deletePayload);
//            var resultDelete = await this.uploadFile(this.EventHelper.TEIS, dataDelete, paramsDeleted);
   try {
            var resultDelete = await this.uploadJson("tracker", deletePayload, paramsDeleted);
            console.log("Delete Result:", resultDelete.data);

            var statsDelete = resultDelete.data.bundleReport.stats || {};
resultAll.deleted += +1;



 } catch (error) {
        console.error("DELETE ERROR TEI:", currentTei.trackedEntity, error);
 resultAll.hasErrors = true;
      resultAll.errors.push({
        uid: currentTei.trackedEntity,
        type: "DELETE",
        message:(error && error.data && error.data.message)
    || (error && error.message)
    || "Error"
    });
    }




//            resultAll.deleted += resultDelete.data.response.deleted || 0;
        }
    }

    console.log("ResultAll:");
    console.log(resultAll);
    resultAll.hasErrors = resultAll.errors.length > 0;
 return resultAll;
}

//FIN CODIGO NUEVO


 private zipObject (name: string, object) {
        //console.log("stringfy");
        //console.log(JSON.stringify(object));
        return  (new JSZip())
            .file(name, JSON.stringify(object))
            .generateAsync({type: "uint8array", compression: "DEFLATE"});
    }

    private uploadFile (endpoint: string, file, params) {
      
        if (file != undefined) {
            return this.$http({
                method: 'POST',
                url: this.commonvariable.url + endpoint,
                params: params,
                data: new Uint8Array(file),
               //data: JSON.stringify(file),
               //headers: { "Content-Type": "application/json" },
                transformRequest: {}
            });
        } else {
            return this.$q.resolve("Nothing to upload");
        }
    }

    private uploadJson (endpoint: string, data, params) {
    return this.$http({
        method: 'POST',
        url: this.commonvariable.url + endpoint,
        params: params,
        data: data,
        headers: { "Content-Type": "application/json" }
    });
}
/*
    private uploadFile2 (endpoint: string, file, params) {
            
        if (file != undefined) {
   
              
                return fetch(this.commonvariable.url + endpoint+'?strategy=SYNC', {
                    method: "POST",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                      },
                    body: JSON.stringify(file)
                  });
              
                                  
                
               
              };
            
        
    }



    requestPostData(endpoint, file, param) {

       var url= this.commonvariable.url + endpoint+'?strategy=SYNC'
        return $.ajax({
            type: "POST",
            data: JSON.stringify(file),
            dataType: "json",
            url: url,
            async: true,
            contentType: 'application/json'
        });
    };

*/
    previewEventFile (file) {
        // It is required to wrap the return into a deferred object. If not, the following promises are not notified
        var deferred = this.$q.defer();
        var enrollmentsAll =[];
        var settings;
        var eventsAll =[];
        this.readEventZipFile(file)
        
            .then((eventFile) =>
            {
               // console.log("llega file");
                settings=eventFile.settings;  
            eventFile.content.trackedEntityInstances.forEach(tei => {
              console.log(tei);
                enrollmentsAll.push(tei.enrollments)
                
            });
          

            enrollmentsAll.forEach(enrollment => {
                enrollment.forEach(element => {
                    element.events.forEach(element2 => {
                    
                        eventsAll.push(element2);
                    });
                    
                });
               
            });
            
            console.log("eventsAll");
            console.log(eventsAll);

         return        this.classifyEventsByProgramAndStage(eventsAll)
        }
        )
            .then((programs) => 
            
            this.addNameToProgramsAndStages(programs))
            .then((summary) => deferred.resolve({"settings":settings,"summary": summary}))
            .catch((error) => deferred.reject(error));
        return deferred.promise;
    }

    private classifyEventsByProgramAndStage (events) {
        var programs = {};
        $.each(events, (index, event) => {
            programs[event.program] = programs[event.program] || {stages:{}};
            programs[event.program].stages[event.programStage] = programs[event.program].stages[event.programStage] || {value: 0};
            programs[event.program].stages[event.programStage].value++;
        });
        return programs;
    }
    
    private addNameToProgramsAndStages (eventsByProgram) {
        var promiseArray = $.map(eventsByProgram, (value, programId: string) => {
            return this.ProgramService.getProgramAndStages(programId);
        });

        return this.$q.all(promiseArray).then((data) => {
            data.forEach(program => {
                eventsByProgram[program.id].name = program.name;
                program.programStages.forEach( stage => {
                    if (eventsByProgram[program.id].stages[stage.id]) {
                        eventsByProgram[program.id].stages[stage.id].name = stage.name;
                    }
                })
            });
            return eventsByProgram;
        });
    }
}
