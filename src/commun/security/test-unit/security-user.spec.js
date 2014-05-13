/**
 * Created by Guillemette on 12/05/2014.
 */
describe('Test security-user module', function () {

    var UserService;

    beforeEach(function () {
        module('fwk-security.user');
    });

    beforeEach(inject(function($injector) {
        UserService = $injector.get('userService');
    }));

    it('should exist UserService', function () {
        expect(UserService).toBeDefined();
    });

    it('should create user', function () {
        var user = UserService({
            "id": 123456,
            "username": "John",
            "roles": ["ADMIN"],
            "firstname": "John",
            "lastname": "Doe",
            "email": "john.doe@unknow.com"
        });
        expect(user).toBeDefined();
        expect(user.getFullname()).toBe("John Doe");
        expect(user.isUserInRole("ADMIN")).toBeTruthy();
        expect(user.isUserInRole("GEST")).toBeFalsy();
    });

    it('should getFullname have been called', function () {
        var user = UserService({
            "id": 123456,
            "username": "John",
            "roles": ["ADMIN"],
            "firstname": "John",
            "lastname": "Doe",
            "email": "john.doe@unknow.com"
        });
        spyOn(user, "getFullname").andReturn("John Doe");;
        spyOn(user, "isUserInRole");
        user.getFullname();
        expect(user.getFullname).toHaveBeenCalled();
        expect(user.isUserInRole).not.toHaveBeenCalled();
    });
});