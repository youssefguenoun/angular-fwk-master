/**
 * Created by guillemette on 11/03/14.
 */

    /**
     * Cette fonction parcours une liste de pattern et vérifie si l'URL fournie apparient a cette liste
     * @param url
     * @param whiteList
     * @returns {boolean}
     */
    var checkWhiteList = function (url, whiteList) {
        var pattern;
        for (var i = 0; i < whiteList.length; i++) {
            pattern = new RegExp(whiteList[i]);
            if (pattern.test(url)) {
                return true;
            }
        }
        return false;
    };


    angular.module('fwk-security.interceptor', ['fwk-security', 'fwk-services'])

        .factory('requestSecurityInterceptor', ['$injector', '$q', '$log', 'localizedMessages', 'dateFilter', 'restFault', 'invalidCredentialFault', 'FWK_CONSTANT', 'tokenService', 'httpLogger', 'UUID',
            function ($injector, $q, $log, localizedMessages, dateFilter, restFault, invalidCredentialFault,FWK_CONSTANT, tokenService, httpLogger, UUID) {

	            var requestInterceptor = {

                    'request': function(config) {

                        var now = new Date();
                        config.requestTimestamp = now.getTime();

                        //Seules certaines URL sont à protéger systématiquement par un jeton JWT...
                        if (checkWhiteList(config.url,FWK_CONSTANT.oauth.whitelist.request )) {
                            // si l'URL appartient à la white list, pas d'ajout de jeton JWT sur l'appel
    //                        $log.debug ('\t Pas de token pour URL : ' + config.url);
                        } else {
                            //...sinon ajout du jeton JWT systématiquement
                           config.headers = config.headers || {};
                           config.headers.Authorization = 'Bearer ' + tokenService.getLocalToken();
                        }
                        config.headers['X-RequestID'] = UUID.randomUUID();
                        config.headers['X-SessionID'] = FWK_CONSTANT.x_session_id;

                        var callLog = localizedMessages.get('trace.request.msg', {
                            dateTime : dateFilter(now, 'dd/MM/yyyy HH:mm:ss'),
                            uuid:  config.headers['X-RequestID'],
                            uuidSession : config.headers['X-SessionID'],
                            url: config.url
                        });

                        httpLogger.pushLog(callLog);

                        return config;
                    }

                };

	            return requestInterceptor;
            }
        ])

        .factory('responseSecurityInterceptor', ['$injector', '$q', '$log', 'dateFilter', 'localizedMessages', 'restFault', 'invalidCredentialFault', 'FWK_CONSTANT', 'tokenService', 'httpLogger', 'fieldValidationFault', 'resourceNotFoundFault', 'accessDeniedFault', 'resourceStateChangedFault',
            function ($injector, $q, $log, dateFilter, localizedMessages, restFault, invalidCredentialFault,FWK_CONSTANT, tokenService, httpLogger, fieldValidationFault, resourceNotFoundFault, accessDeniedFault, resourceStateChangedFault) {


	            var pushTrace = function(response, status) {

	                var now = new Date();
	                var timeElapsed = (now.getTime() - response.config.requestTimestamp) / 1000;

	                var callLog = localizedMessages.get('trace.response.msg', {
	                    dateTime : dateFilter(now, 'dd/MM/yyyy HH:mm:ss'),
	                    uuid:  response.config.headers['X-RequestID'],
                        uuidSession : response.config.headers['X-SessionID'],
	                    url: response.config.url,
	                    delay: timeElapsed,
	                    type : status,
	                    status: response.status
	                });

	                httpLogger.pushLog(callLog);
	            };

                var throwException = function(response) {
                    var msgErreur, fault;
                    msgErreur = localizedMessages.get('resource.error.server', {resourcename: response.config.url});
                    fault = restFault(msgErreur, response);
                    throw fault;
                };

	            /**
	             * Traitement réalisé si HTTP 400 Bad Request
	             * Structure normalisée
	             * exemple
	             * {"typeError":"FIELD_VALIDATION_ERROR",
	             *    "fieldErrors":[
	             *       {"fieldname":"nom","message":"La taille du champ nom doit &amp;ecirc&#x3b;tre comprise entre 3 et 30 caract&amp;egrave&#x3b;res","type":"Size"},
	             *       {"fieldname":"adresse","message":"La taille du champ adresse doit &amp;ecirc&#x3b;tre comprise entre 5 et 50 caract&amp;egrave&#x3b;res","type":"Size"}
	             *    ]
	             * }
	             * La fonction lève une fieldValidationFault qui devra être traitée par la couhce présentation, ie le controller
	             */
	            var process400 = function(response) {
	                // HTTP 400 Bad Request
	                $log.debug('\t...400 Bad Request detected');

	                var msgErreur, fault;

	                if (response.data && response.data.typeError === 'FieldValidationFault') {
	                    msgErreur = localizedMessages.get('resource.validation.error.server', {});
	                    fault = fieldValidationFault(msgErreur, response.data);
	                    return $q.reject(fault);
	                } else {
                        return throwException(response);
	                }
	            };

                /**
                 * HTTP 401 unauthorized
                 * Renvoyer par l'idp. Plusieurs raisons : jeton invalide, expiré, absent, corrompu, ...etc
                 * Ici prise en charge des code retour de WSO2
                 * @param response
                 * @returns {*}
                 */
	            var process401 = function(response) {

	                // HTTP 401 Unauthorized
	                $log.debug('\t...401 detected');

	                //var msgErreur, fault;

	                //Un 401 pour une mire d'authent avec une HTTP basic Authent est normale (invalid login/password, ...), pour les autres on renégocie un jeton
	                if (checkWhiteList(response.config.url, FWK_CONSTANT.oauth.whitelist.response)) {

	                    // pour les whites list (ex mire de login) on laisse l'erreur se progager et remontée vers la couche appelante
	                    if (response.data === 'Unauthorized') {
	                        return $q.reject(invalidCredentialFault(localizedMessages.get('login.error.invalidCredentials', {})));
	                    } else {
	                        //l'erreur est plus sérieuse
	                        return $q.reject(restFault(localizedMessages.get('resource.error.server', {resourcename: response.config.url}), response));
	                    }

	                } else {

	                    var $http = $injector.get('$http');
	                    var oauthService = $injector.get('oauthService');

                        // Traitement des codes retours de WSO2
	                    // HTTP 401 pris en charge :
	                    // {"typeError":"900902","message":"Missing Credentials"}
                        // {"typeError":"900903","message":"Access Token Expired"}
                        // {"typeError":"900904","message":"Access Token Inactive"}
	                    if (response.data.typeError && (
                                response.data.typeError === '900902' ||
                                response.data.typeError === '900903' ||
                                response.data.typeError === '900904')) {

	                        $log.debug('\t...demande de renouvellement du jeton');
	                        //renvoi d'une promise avec récup du jeton + ressoumission de la requette
	                        return oauthService.retrieveToken()
	                                .then(function (token) {
	                                    var newConfig = response.config;
	                                    newConfig.headers.Authorization = 'Bearer ' + token;
	                                    return $http(newConfig);
	                                });
	                    } else {
                            // {"typeError":"900901","message":"Invalid Credentials"} + autres codes listés ici : https://docs.wso2.com/display/AM170/Error+Handling
                            return throwException(response);
	                    }
	                }

	            };

                /**
                 * L'utilisateur ne dispose pas des droits suffisants pour accéder au service.
                 * Les droits de l'applications AngularJS sont vérifiés via le Jeton OAUTH au niveau du SPS
                 * @param response
                 * @returns {Promise}
                 */
                var process403 = function(response) {

                    // HTTP 403 Forbidden
                    $log.debug('\t...403 Forbidden');

                    var msgErreur, fault;

                    if (response.data && response.data.typeError === 'AccessDeniedFault') {
                        msgErreur = localizedMessages.get('resource.access.denied', {});
                        fault = accessDeniedFault(msgErreur, response.data);
                        return $q.reject(fault);
                    } else {
                        return throwException(response);
                    }
                };
                /**
                 * Traitemùent réalisé si le servoce retourne une HTTP 404 not found
                 * Deux cas de figure :
                 *    1. l'URI employée n'existe pas : erreur technique ==> on doit renvoyer l'utilisateur vers une page d'erreur
                 *    2. L'URI employée est correcte mais la la recherche applicative de la ressource se solde par un échec. La ressource demandée n'a pu être trouvée.
                 *    ==> Dans ce cas, on renvoit une exception au service pour qu'il le remonte au niveau de l'IHM pour affichage de l'info.
                 * @param response
                 * @returns {Promise}
                 */
                var process404 = function(response) {

                    // HTTP 404 Not Found
                    $log.debug('\t...404 Not Found detected');

                    var msgErreur, fault;

                    if (response.data && response.data.typeError === 'ResourceNotFoundFault') {
                        msgErreur = localizedMessages.get('resource.not.found', {messageFromserver: response.data.message || 'Ressource non trouvée !'});
                        fault = resourceNotFoundFault(msgErreur, response.data);
                        return $q.reject(fault);
                    } else {
                        return throwException(response);
                    }
                };

                /**
                 * HTTP 409 Conflict
                 * Traitement réponse HTTP 409, ie la demande de mise à jour est rejetée
                 * par le serveur car un autre utilisateur à déja modifié la meme ressource
                 * @param response
                 * @returns {Promise}
                 */
                var process409 = function(response) {

                    // HTTP 409 Not Found
                    $log.debug('\t...409 Not Found detected');

                    var msgErreur, fault;

                    if (response.data && response.data.typeError === 'ResourceStateChangedFault') {
                        msgErreur = localizedMessages.get('resource.conflict', {messageFromserver: response.data.message || 'La ressource a déjà été modifiée par u autre utilisateur!'});
                        fault = resourceStateChangedFault(msgErreur, response.data);
                        return $q.reject(fault);
                    } else {
                        return throwException(response);
                    }
                };

                var responseInterceptor = {

                	// 20x
                	// 304 Not modified (a noter : code retour 200 pour angularjs)
                    'response': function(response) {

                    	pushTrace(response, 'SUCCESS');
                        return response || $q.when(response);
                    },

                    'responseError': function(response) {

                        //si plantage en d'un problème Javascript...
                        if (response instanceof Error) {
                            throw response;
                        }  else {

                        	pushTrace(response, 'ERROR');

                        	 switch (response.status)
                             {
                                 case 400:
                                     return process400(response);
                                 case 401:
                                     return process401(response);
                                 case 403:
                                     return process403(response);
                                 case 404:
                                     return process404(response);
                                 case 409:
                                     return process409(response);
                                 default:
                                     var msgErreur = localizedMessages.get('resource.error.server', {resourcename: response.config.url});
                                     throw restFault(msgErreur, response);
                             }

                        }

                    }
                };

                return responseInterceptor;

            }]);
