import {
  AsyncTestCompleter,
  beforeEach,
  ddescribe,
  describe,
  el,
  expect,
  iit,
  inject,
  it,
  xit,
  beforeEachBindings,
  SpyObject,
} from 'angular2/test_lib';

import {MapWrapper} from 'angular2/src/facade/collection';
import {DOM} from 'angular2/src/dom/dom_adapter';

import {DomTestbed, TestRootView, elRef} from './dom_testbed';

import {ViewDefinition, DirectiveMetadata, RenderViewRef} from 'angular2/src/render/api';
import {DOM_REFLECT_PROPERTIES_AS_ATTRIBUTES} from 'angular2/src/render/dom/dom_renderer';
import {ShadowDomStrategy, NativeShadowDomStrategy} from 'angular2/render';
import {bind} from 'angular2/di';

export function main() {
  describe('DomRenderer integration', () => {
    beforeEachBindings(() => [DomTestbed]);

    it('should create and destroy root host views while using the given elements in place',
       inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
         tb.compiler.compileHost(someComponent)
             .then((hostProtoViewDto) => {
               var view = new TestRootView(
                   tb.renderer.createRootHostView(hostProtoViewDto.render, 0, '#root'));
               expect(tb.rootEl.parentNode).toBeTruthy();
               expect(view.hostElement).toEqual(tb.rootEl);

               tb.renderer.detachFragment(view.fragments[0]);
               tb.renderer.destroyView(view.viewRef);
               expect(tb.rootEl.parentNode).toBeFalsy();

               async.done();
             });
       }));

    it('should update text nodes',
       inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
         tb.compileAndMerge(
               someComponent,
               [
                 new ViewDefinition(
                     {componentId: 'someComponent', template: '{{a}}', directives: []})
               ])
             .then((protoViewMergeMappings) => {
               var rootView = tb.createView(protoViewMergeMappings[0]);

               tb.renderer.setText(rootView.viewRef, 0, 'hello');
               expect(rootView.hostElement).toHaveText('hello');
               async.done();
             });
       }));

    it('should update any element property/attributes/class/style independent of the compilation',
       inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
         tb.compileAndMerge(someComponent,
                            [
                              new ViewDefinition({
                                componentId: 'someComponent',
                                template: '<input [title]="y" style="position:absolute">',
                                directives: []
                              })
                            ])
             .then((protoViewMergeMappings) => {
               var rootView = tb.createView(protoViewMergeMappings[0]);

               var elr = elRef(rootView.viewRef, 1);
               var el = DOM.childNodes(rootView.hostElement)[0];
               tb.renderer.setElementProperty(elr, 'value', 'hello');
               expect((<HTMLInputElement>el).value).toEqual('hello');

               tb.renderer.setElementClass(elr, 'a', true);
               expect((<HTMLInputElement>DOM.childNodes(rootView.hostElement)[0]).value)
                   .toEqual('hello');
               tb.renderer.setElementClass(elr, 'a', false);
               expect(DOM.hasClass(el, 'a')).toBe(false);

               tb.renderer.setElementStyle(elr, 'width', '10px');
               expect(DOM.getStyle(el, 'width')).toEqual('10px');
               tb.renderer.setElementStyle(elr, 'width', null);
               expect(DOM.getStyle(el, 'width')).toEqual('');

               tb.renderer.setElementAttribute(elr, 'someAttr', 'someValue');
               expect(DOM.getAttribute(el, 'some-attr')).toEqual('someValue');

               async.done();
             });
       }));


    it('should NOT reflect property values as attributes if flag is NOT set',
       inject([AsyncTestCompleter, DomTestbed], (async, tb) => {
         tb.compileAndMerge(someComponent,
                            [
                              new ViewDefinition({
                                componentId: 'someComponent',
                                template: '<input [title]="y">',
                                directives: []
                              })
                            ])
             .then((protoViewMergeMappings) => {
               var rootView = tb.createView(protoViewMergeMappings[0]);
               var el = DOM.childNodes(rootView.hostElement)[0];
               tb.renderer.setElementProperty(elRef(rootView.viewRef, 1), 'maxLength', '20');
               expect(DOM.getAttribute(<HTMLInputElement>el, 'ng-reflect-max-length'))
                   .toEqual(null);

               async.done();
             });
       }));

    describe('reflection', () => {
      beforeEachBindings(() => [bind(DOM_REFLECT_PROPERTIES_AS_ATTRIBUTES).toValue(true)]);

      it('should reflect property values as attributes if flag is set',
         inject([AsyncTestCompleter, DomTestbed], (async, tb) => {
           tb.compileAndMerge(someComponent,
                              [
                                new ViewDefinition({
                                  componentId: 'someComponent',
                                  template: '<input [title]="y">',
                                  directives: []
                                })
                              ])
               .then((protoViewMergeMappings) => {
                 var rootView = tb.createView(protoViewMergeMappings[0]);
                 var el = DOM.childNodes(rootView.hostElement)[0];
                 tb.renderer.setElementProperty(elRef(rootView.viewRef, 1), 'maxLength', '20');
                 expect(DOM.getAttribute(<HTMLInputElement>el, 'ng-reflect-max-length'))
                     .toEqual('20');
                 async.done();
               });
         }));
    });

    if (DOM.supportsDOMEvents()) {
      it('should call actions on the element independent of the compilation',
         inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
           tb.compileAndMerge(someComponent,
                              [
                                new ViewDefinition({
                                  componentId: 'someComponent',
                                  template: '<input [title]="y"></input>',
                                  directives: []
                                })
                              ])
               .then((protoViewMergeMappings) => {
                 var rootView = tb.createView(protoViewMergeMappings[0]);

                 tb.renderer.invokeElementMethod(elRef(rootView.viewRef, 1), 'setAttribute',
                                                 ['a', 'b']);

                 expect(DOM.getAttribute(DOM.childNodes(rootView.hostElement)[0], 'a'))
                     .toEqual('b');
                 async.done();
               });
         }));
    }

    it('should add and remove fragments',
       inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
         tb.compileAndMerge(someComponent,
                            [
                              new ViewDefinition({
                                componentId: 'someComponent',
                                template: '<template>hello</template>',
                                directives: []
                              })
                            ])
             .then((protoViewMergeMappings) => {
               var rootView = tb.createView(protoViewMergeMappings[0]);

               var elr = elRef(rootView.viewRef, 1);
               expect(rootView.hostElement).toHaveText('');
               var fragment = rootView.fragments[1];
               tb.renderer.attachFragmentAfterElement(elr, fragment);
               expect(rootView.hostElement).toHaveText('hello');
               tb.renderer.detachFragment(fragment);
               expect(rootView.hostElement).toHaveText('');

               async.done();
             });
       }));

    it('should handle events', inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
         tb.compileAndMerge(someComponent,
                            [
                              new ViewDefinition({
                                componentId: 'someComponent',
                                template: '<input (change)="doSomething()">',
                                directives: []
                              })
                            ])
             .then((protoViewDtos) => {
               var rootView = tb.createView(protoViewDtos[0]);

               tb.triggerEvent(elRef(rootView.viewRef, 1), 'change');
               var eventEntry = rootView.events[0];
               // bound element index
               expect(eventEntry[0]).toEqual(1);
               // event type
               expect(eventEntry[1]).toEqual('change');
               // actual event
               expect((<Map<any, any>>eventEntry[2]).get('$event').type).toEqual('change');
               async.done();
             });

       }));

    if (DOM.supportsNativeShadowDOM()) {
      describe('native shadow dom support', () => {
        beforeEachBindings(
            () => { return [bind(ShadowDomStrategy).toValue(new NativeShadowDomStrategy())]; });

        it('should support shadow dom components',
           inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
             tb.compileAndMerge(
                   someComponent,
                   [
                     new ViewDefinition(
                         {componentId: 'someComponent', template: 'hello', directives: []})
                   ])
                 .then((protoViewMergeMappings) => {
                   var rootView = tb.createView(protoViewMergeMappings[0]);
                   expect(DOM.getShadowRoot(rootView.hostElement)).toHaveText('hello');
                   async.done();
                 });

           }));
      });
    }


  });
}

var someComponent = DirectiveMetadata.create(
    {id: 'someComponent', type: DirectiveMetadata.COMPONENT_TYPE, selector: 'some-comp'});
