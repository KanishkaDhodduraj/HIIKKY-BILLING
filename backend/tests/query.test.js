import { escapeRegex, pageSpec } from '../src/utils/query.js';
test('escapes regex metacharacters for literal substring search',()=>{expect(escapeRegex('a+b.*')).toBe('a\\+b\\.\\*');});
test('page is zero based with validated size and stable id tie breaker',()=>{expect(pageSpec({page:'2',size:'10',sortBy:'email',sortDirection:'DESC'},['id','email'])).toMatchObject({page:2,size:10,skip:20,sort:{email:-1,_id:1}});});
test('rejects unsupported sort fields and invalid sizes',()=>{expect(()=>pageSpec({sortBy:'passwordHash'},['id'])).toThrow();expect(()=>pageSpec({size:'101'},['id'])).toThrow();});
