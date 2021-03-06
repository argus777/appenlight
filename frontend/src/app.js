// Copyright 2010 - 2017 RhodeCode GmbH and the AppEnlight project authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

// Declare app level module which depends on filters, and services
angular.module('appenlight.base', [
    'ngRoute',
    'ui.router',
    'ui.router.router',
    'underscore',
    'ui.bootstrap',
    'ngResource',
    'ngAnimate',
    'ngCookies',
    'smart-table',
    'angular-toArrayFilter',
    'mentio'
]);

angular.module('appenlight.filters', []);
angular.module('appenlight.templates', []);
angular.module('appenlight.controllers', [
    'appenlight.base'
]);
angular.module('appenlight.components', [
    'appenlight.components.channelstream',
    'appenlight.components.appenlightApp',
    'appenlight.components.appenlightHeader',
    'appenlight.components.indexDashboardView',
    'appenlight.components.logsBrowserView',
    'appenlight.components.reportView',
    'appenlight.components.reportsBrowserView',
    'appenlight.components.reportsSlowBrowserView',
    'appenlight.components.eventBrowserView',
    'appenlight.components.userProfileView',
    'appenlight.components.userIdentitiesView',
    'appenlight.components.userPasswordView',
    'appenlight.components.userAuthTokensView',
    'appenlight.components.userAlertChannelsListView',
    'appenlight.components.userAlertChannelsEmailNewView',
    'appenlight.components.applicationsListView',
    'appenlight.components.applicationsPurgeLogsView',
    'appenlight.components.applicationsUpdateView',
    'appenlight.components.integrationsListView',
    'appenlight.components.bitbucketIntegrationConfigView',
    'appenlight.components.campfireIntegrationConfigView',
    'appenlight.components.flowdockIntegrationConfigView',
    'appenlight.components.githubIntegrationConfigView',
    'appenlight.components.hipchatIntegrationConfigView',
    'appenlight.components.jiraIntegrationConfigView',
    'appenlight.components.slackIntegrationConfigView',
    'appenlight.components.webhooksIntegrationConfigView',
    'appenlight.components.adminView',
    'appenlight.components.adminApplicationsListView',
    'appenlight.components.adminUsersListView',
    'appenlight.components.adminUsersCreateView',
    'appenlight.components.adminGroupsListView',
    'appenlight.components.adminGroupsCreateView',
    'appenlight.components.adminConfigurationView',
    'appenlight.components.adminSystemView',
    'appenlight.components.adminPartitionsView',
    'appenlight.components.settingsView'
]);
angular.module('appenlight.directives', [
    'appenlight.directives.c3chart',
    'appenlight.directives.confirmValidate',
    'appenlight.directives.focus',
    'appenlight.directives.formErrors',
    'appenlight.directives.humanFormat',
    'appenlight.directives.isoToRelativeTime',
    'appenlight.directives.permissionsForm',
    'appenlight.directives.smallReportGroupList',
    'appenlight.directives.smallReportList',
    'appenlight.directives.pluginConfig',
    'appenlight.directives.recursive',
    'appenlight.directives.reportAlertAction',
    'appenlight.directives.postProcessAction',
    'appenlight.directives.rule',
    'appenlight.directives.ruleReadOnly'
]);
angular.module('appenlight.services', [
    'appenlight.services.chartResultParser',
    'appenlight.services.resources',
    'appenlight.services.stateHolder',
    'appenlight.services.typeAheadTagHelper',
    'appenlight.services.UUIDProvider'
]).value('version', '0.1');


var pluginsToLoad = _.map(decodeEncodedJSON(window.AE.plugins),
    function(item){
        return item.config.javascript.angular_module
    });
console.info(pluginsToLoad);

angular.module('appenlight.plugins', pluginsToLoad);

var app = angular.module('appenlight', [
    'appenlight.base',
    'appenlight.config',
    'appenlight.templates',
    'appenlight.filters',
    'appenlight.services',
    'appenlight.directives',
    'appenlight.controllers',
    'appenlight.components',
    'appenlight.plugins'
]);

// needs manual execution because of plugin files
function kickstartAE(initialUserData) {
    app.config(['$httpProvider', '$uibTooltipProvider', '$locationProvider', function ($httpProvider, $uibTooltipProvider, $locationProvider) {
        $locationProvider.html5Mode(true);
        $httpProvider.interceptors.push(['$q', '$rootScope', '$timeout', 'stateHolder', function ($q, $rootScope, $timeout, stateHolder) {
            return {
                'response': function (response) {
                    var flashMessages = angular.fromJson(response.headers('x-flash-messages'));
                    if (flashMessages && flashMessages.length > 0) {
                        stateHolder.flashMessages.extend(flashMessages);
                    }
                    return response;
                },
                'responseError': function (rejection) {
                    if (rejection.status > 299 && rejection.status !== 422) {
                        stateHolder.flashMessages.extend([{
                            msg: 'Response status code: ' + rejection.status + ', "' + rejection.statusText + '", url: ' + rejection.config.url,
                            type: 'error'
                        }]);
                    }
                    if (rejection.status == 0) {
                        stateHolder.flashMessages.extend([{
                            msg: 'Response timeout',
                            type: 'error'
                        }]);
                    }
                    var flashMessages = angular.fromJson(rejection.headers('x-flash-messages'));
                    if (flashMessages && flashMessages.length > 0) {
                        stateHolder.flashMessages.extend(flashMessages);
                    }

                    return $q.reject(rejection);
                }
            }
        }]);

        $uibTooltipProvider.options({appendToBody: true});

    }]);


    app.config(function ($provide) {
        $provide.decorator("$exceptionHandler", function ($delegate) {
            return function (exception, cause) {
                $delegate(exception, cause);
                if (typeof AppEnlight !== 'undefined') {
                    AppEnlight.grabError(exception);
                }
            };
        });
    });

    app.run(['$rootScope', '$timeout', 'stateHolder', '$state', '$location', '$transitions', '$window', 'AeConfig',
        function ($rootScope, $timeout, stateHolder, $state, $location, $transitions, $window, AeConfig) {
            console.log('appenlight run()');
            if (initialUserData){
                stateHolder.AeUser.update(initialUserData);

                if (stateHolder.AeUser.hasAppPermission('root_administration'
                )){
                    AeConfig.topNav.menuAdminItems.push(
                        {'sref': 'admin', 'label': 'Admin Settings'}
                    )
                }

            }
            $rootScope.$state = $state;
            $rootScope.stateHolder = stateHolder;
            $rootScope.flash = stateHolder.flashMessages.list;
            $rootScope.closeAlert = stateHolder.flashMessages.closeAlert;
            $rootScope.AeConfig = AeConfig;

            var transitionApp = function($transition$, $state) {
                // redirect user to /register unless its one of open views
                var isGuestState = [
                        'report.view_detail',
                        'report.view_group',
                        'dashboard.view'
                    ].indexOf($transition$.to().name) !== -1;

                var path = $window.location.pathname;
                // strip trailing slash
                if (path.substr(path.length - 1) === '/') {
                    path = path.substr(0, path.length - 1);
                }
                var isOpenView = false;
                var openViews = [
                    AeConfig.urls.otherRoutes.lostPassword,
                    AeConfig.urls.otherRoutes.lostPasswordGenerate
                ];
                console.log('$transitions.onBefore', path, $transition$.to().name, $state);
                _.each(openViews, function (url) {
                    var url = '/' + url.split('/').slice(3).join('/');
                    if (url === path) {
                        isOpenView = true;
                    }
                });
                if (stateHolder.AeUser.id === null && !isGuestState && !isOpenView) {
                    if (window.location.toString().indexOf(AeConfig.urls.otherRoutes.register) === -1) {
                        console.log('redirect to register');
                        var newLocation = AeConfig.urls.otherRoutes.register + '?came_from=' + encodeURIComponent(window.location);
                        // fix infinite digest here
                        $rootScope.$on('$locationChangeStart',
                            function(event, toState, toParams, fromState, fromParams, options){
                                event.preventDefault();
                                $window.location = newLocation;
                            });
                        $window.location = newLocation;
                        return false;
                    }
                    return false;
                }
                return true;
            };

            for (var i=0; i < stateHolder.plugins.callables.length; i++){
                stateHolder.plugins.callables[i]();
            }

            $transitions.onBefore({}, transitionApp);
        }]);
}
