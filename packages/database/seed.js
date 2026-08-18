"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = require("bcrypt");
var dotenv = require("dotenv");
var path = require("path");
// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var adminEmail, adminPassword, org, rolesToCreate, dbRoles, _i, rolesToCreate_1, r, role, permissionsToCreate, dbPermissions, _a, permissionsToCreate_1, action, permission, _b, permissionsToCreate_2, action, hashedPassword, user;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    adminEmail = process.env.ADMIN_EMAIL || 'admin@agencyos.com';
                    adminPassword = process.env.ADMIN_PASSWORD || 'SuperSecureAdminPassword123!';
                    console.log('Seeding database...');
                    console.log("Admin email configured: ".concat(adminEmail));
                    return [4 /*yield*/, prisma.organization.upsert({
                            where: { slug: 'tfx-ai-demo-org' },
                            update: {},
                            create: {
                                name: 'TFX AI Demo Org',
                                slug: 'tfx-ai-demo-org',
                            },
                        })];
                case 1:
                    org = _c.sent();
                    console.log("Default Organization created/loaded: ".concat(org.name));
                    rolesToCreate = [
                        { name: 'admin', description: 'Administrator with full access' },
                        { name: 'employee', description: 'Staff member' },
                        { name: 'client', description: 'External client portal user' },
                    ];
                    dbRoles = {};
                    _i = 0, rolesToCreate_1 = rolesToCreate;
                    _c.label = 2;
                case 2:
                    if (!(_i < rolesToCreate_1.length)) return [3 /*break*/, 5];
                    r = rolesToCreate_1[_i];
                    return [4 /*yield*/, prisma.role.upsert({
                            where: { name: r.name },
                            update: { description: r.description },
                            create: r,
                        })];
                case 3:
                    role = _c.sent();
                    dbRoles[r.name] = role;
                    console.log("Role upserted: ".concat(role.name));
                    _c.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    permissionsToCreate = [
                        'crm:read', 'crm:write',
                        'billing:read', 'billing:write',
                        'hr:read', 'hr:write',
                        'projects:read', 'projects:write',
                    ];
                    dbPermissions = {};
                    _a = 0, permissionsToCreate_1 = permissionsToCreate;
                    _c.label = 6;
                case 6:
                    if (!(_a < permissionsToCreate_1.length)) return [3 /*break*/, 9];
                    action = permissionsToCreate_1[_a];
                    return [4 /*yield*/, prisma.permission.upsert({
                            where: { action: action },
                            update: {},
                            create: { action: action },
                        })];
                case 7:
                    permission = _c.sent();
                    dbPermissions[action] = permission;
                    console.log("Permission upserted: ".concat(permission.action));
                    _c.label = 8;
                case 8:
                    _a++;
                    return [3 /*break*/, 6];
                case 9:
                    _b = 0, permissionsToCreate_2 = permissionsToCreate;
                    _c.label = 10;
                case 10:
                    if (!(_b < permissionsToCreate_2.length)) return [3 /*break*/, 13];
                    action = permissionsToCreate_2[_b];
                    return [4 /*yield*/, prisma.rolePermission.upsert({
                            where: {
                                roleId_permissionId: {
                                    roleId: dbRoles.admin.id,
                                    permissionId: dbPermissions[action].id,
                                },
                            },
                            update: {},
                            create: {
                                roleId: dbRoles.admin.id,
                                permissionId: dbPermissions[action].id,
                            },
                        })];
                case 11:
                    _c.sent();
                    _c.label = 12;
                case 12:
                    _b++;
                    return [3 /*break*/, 10];
                case 13:
                    console.log('All permissions assigned to admin role.');
                    return [4 /*yield*/, bcrypt.hash(adminPassword, 12)];
                case 14:
                    hashedPassword = _c.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: adminEmail },
                            update: {
                                password: hashedPassword,
                                name: 'System Admin',
                                isActive: true,
                                organizationId: org.id,
                            },
                            create: {
                                email: adminEmail,
                                password: hashedPassword,
                                name: 'System Admin',
                                isActive: true,
                                organizationId: org.id,
                            },
                        })];
                case 15:
                    user = _c.sent();
                    console.log("Admin User upserted: ".concat(user.email));
                    // 6. Assign Admin Role to Admin User
                    return [4 /*yield*/, prisma.userRole.upsert({
                            where: {
                                userId_roleId: {
                                    userId: user.id,
                                    roleId: dbRoles.admin.id,
                                },
                            },
                            update: {},
                            create: {
                                userId: user.id,
                                roleId: dbRoles.admin.id,
                            },
                        })];
                case 16:
                    // 6. Assign Admin Role to Admin User
                    _c.sent();
                    console.log("Admin role assigned to user: ".concat(user.email));
                    console.log('Seeding completed successfully.');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('Error during seeding:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
