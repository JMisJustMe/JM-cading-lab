"""JM MCP WORKSHOP recipe language v0.1. No eval, import, network or host writes.

Recipes are declarative data, not executable user code.  Dynamic recipes may
be executed only within the explicit primitives implemented below.
"""
from __future__ import annotations
import hashlib
import json
import re

NAME = re.compile(r'^[a-z][a-z0-9_]{2,47}$')
FIELD = re.compile(r'^[a-z][a-z0-9_]{0,39}$')
TYPES = ('string', 'integer', 'number', 'boolean', 'array')
OPS = ('copy', 'uppercase', 'lowercase', 'prefix', 'suffix', 'length', 'add', 'join', 'format', 'literal')

class RecipeError(ValueError):
    pass


def canonical(v):
    return json.dumps(v, ensure_ascii=True, sort_keys=True, separators=(',', ':'), allow_nan=False)


def digest(v):
    return hashlib.sha256(canonical(v).encode('ascii')).hexdigest()


def _object(obj, fields, label):
    if not isinstance(obj, dict) or not set(obj).issubset(fields):
        raise RecipeError(label + ': invalid properties or object type')


def _name(x, pattern, what):
    if not isinstance(x, str) or not pattern.fullmatch(x):
        raise RecipeError(what + ': invalid name')


def validate_recipe(recipe):
    if not isinstance(recipe, dict) or len(canonical(recipe)) > 12000:
        raise RecipeError('recipe must be an object <=12000 serialized characters')
    _object(recipe, {'slug', 'description', 'inputs', 'steps', 'outputs'}, 'recipe')
    if set(recipe) != {'slug', 'description', 'inputs', 'steps', 'outputs'}:
        raise RecipeError('required: slug, description, inputs, steps, outputs')
    _name(recipe['slug'], NAME, 'slug')
    desc = recipe['description']
    if not isinstance(desc, str) or not 8 <= len(desc) <= 240:
        raise RecipeError('description must have 8-240 characters')
    inputs, steps, outputs = recipe['inputs'], recipe['steps'], recipe['outputs']
    if not isinstance(inputs, list) or not 1 <= len(inputs) <= 12:
        raise RecipeError('inputs: 1-12 items')
    if not isinstance(steps, list) or not 1 <= len(steps) <= 16:
        raise RecipeError('steps: 1-16 items')
    if not isinstance(outputs, list) or not 1 <= len(outputs) <= 12:
        raise RecipeError('outputs: 1-12 items')
    seen = set()
    for inp in inputs:
        _object(inp, {'name','type','required'}, 'input')
        if set(inp) != {'name', 'type', 'required'}:
            raise RecipeError('input requires name, type, required')
        _name(inp['name'], FIELD, 'input')
        if inp['name'] in seen or inp['name'] in ('schema', '__class__'):
            raise RecipeError('duplicate/reserved input')
        if inp['type'] not in TYPES or type(inp['required']) is not bool:
            raise RecipeError('invalid input type/required')
        seen.add(inp['name'])
    all_names = set(seen)
    for step in steps:
        _object(step, {'op', 'as', 'from', 'with', 'value', 'parts', 'template'}, 'step')
        op = step.get('op')
        if op not in OPS:
            raise RecipeError('unknown operation')
        out = step.get('as')
        _name(out, FIELD, 'step output')
        if out in all_names:
            raise RecipeError('duplicate/overwriting step output')
        if op in ('copy','uppercase','lowercase','prefix','suffix','length'):
            if set(step) != ({'op','as','from'} if op in ('copy','uppercase','lowercase','length') else {'op','as','from','value'}):
                raise RecipeError('step wrong fields for '+op)
            src = step['from']
            if src not in all_names:
                raise RecipeError('unknown step input')
            if op in ('prefix','suffix') and (not isinstance(step['value'],str) or len(step['value'])>160):
                raise RecipeError('prefix/suffix value must be short text')
        elif op == 'add':
            if set(step) != {'op','as','from','with'} or step['from'] not in all_names or step['with'] not in all_names:
                raise RecipeError('add requires two earlier fields')
        elif op == 'join':
            if set(step) != {'op','as','parts','value'} or not isinstance(step['parts'],list) or not 1<=len(step['parts'])<=8 or any(not isinstance(z,str) or z not in all_names for z in step['parts']) or not isinstance(step['value'],str) or len(step['value'])>40:
                raise RecipeError('join requires parts and short delimiter')
        elif op == 'format':
            if set(step) != {'op','as','template'} or not isinstance(step['template'],str) or len(step['template'])>240:
                raise RecipeError('format needs short template')
            fields = re.findall(r'\{([^{}]*)\}', step['template'])
            if any(not FIELD.fullmatch(field) or field not in all_names for field in fields) or step['template'].count('{') != len(fields) or step['template'].count('}') != len(fields):
                raise RecipeError('format placeholders must be earlier field names, e.g. {name}')
        elif op == 'literal':
            if set(step) != {'op','as','value'} or type(step['value']) not in (str,int,float,bool) or (isinstance(step['value'],str) and len(step['value'])>160):
                raise RecipeError('literal must be bounded primitive')
        all_names.add(out)
    if len(set(outputs)) != len(outputs) or any(not isinstance(z,str) or z not in all_names for z in outputs):
        raise RecipeError('outputs must identify unique existing fields')
    return recipe


def json_schema(recipe):
    validate_recipe(recipe)
    variants = {'string': {'type':'string','maxLength':2000},'integer':{'type':'integer'},'number':{'type':'number'},'boolean':{'type':'boolean'},'array':{'type':'array','maxItems':64,'items':{'type':['string','number','boolean']}}}
    return {'type':'object','properties':{x['name']: variants[x['type']] for x in recipe['inputs']},'required':[x['name'] for x in recipe['inputs'] if x['required']], 'additionalProperties':False}


def _coerce_type(v, t):
    if t == 'string': return isinstance(v,str) and len(v)<=2000
    if t == 'integer': return type(v) is int and abs(v)<=1_000_000_000
    if t == 'number': return type(v) in (int,float) and abs(v)<=1_000_000_000
    if t == 'boolean': return type(v) is bool
    if t == 'array': return isinstance(v,list) and len(v)<=64 and all(type(x) in (str,int,float,bool) and (len(x)<=400 if isinstance(x,str) else True) for x in v)
    return False


def execute(recipe, arguments):
    validate_recipe(recipe)
    if not isinstance(arguments,dict) or len(canonical(arguments))>12000:
        raise RecipeError('arguments must be a small object')
    schema = json_schema(recipe)
    if not set(arguments).issubset(schema['properties']) or not set(schema['required']).issubset(arguments):
        raise RecipeError('missing/extra arguments')
    for i in recipe['inputs']:
        if i['name'] in arguments and not _coerce_type(arguments[i['name']], i['type']):
            raise RecipeError('invalid argument '+i['name'])
    fields = dict(arguments)
    for step in recipe['steps']:
        op, key = step['op'],step['as']
        if op != 'literal' and op != 'format' and op != 'join' and ('from' in step) and step['from'] not in fields:
            raise RecipeError('optional input unavailable: '+step['from'])
        a = fields.get(step.get('from'))
        if op == 'copy': v=a
        elif op == 'uppercase':
            if not isinstance(a,str): raise RecipeError('uppercase expects string')
            v=a.upper()
        elif op == 'lowercase':
            if not isinstance(a,str): raise RecipeError('lowercase expects string')
            v=a.lower()
        elif op == 'prefix': v=step['value'] + str(a)
        elif op == 'suffix': v=str(a) + step['value']
        elif op == 'length':
            if not isinstance(a,(str,list)): raise RecipeError('length expects string/array')
            v=len(a)
        elif op == 'add':
            b=fields.get(step['with'])
            if type(a) not in (int,float) or type(b) not in (int,float): raise RecipeError('add requires numbers')
            v=a+b
        elif op == 'join':
            if any(x not in fields for x in step['parts']): raise RecipeError('join missing argument')
            v=step['value'].join(str(fields[x]) for x in step['parts'])
        elif op == 'format':
            v=step['template']
            for field in re.findall(r'\{([^{}]*)\}', v):
                if field not in fields: raise RecipeError('format missing '+field)
                v=v.replace('{'+field+'}',str(fields[field]))
        elif op == 'literal': v=step['value']
        if isinstance(v,str) and len(v)>4000: raise RecipeError('output text too large')
        if isinstance(v,(int,float)) and abs(v)>1e12: raise RecipeError('output number too large')
        fields[key]=v
    return {z:fields[z] for z in recipe['outputs']}


def sample_recipe():
    return {'slug':'jm_greeting','description':'Create a short personalised JM greeting using a safe programmable sequence.',
            'inputs':[{'name':'name','type':'string','required':True}],
            'steps':[{'op':'uppercase','from':'name','as':'upper_name'},
                     {'op':'prefix','from':'upper_name','value':'JM says hello, ','as':'greeting'}],
            'outputs':['greeting']}
