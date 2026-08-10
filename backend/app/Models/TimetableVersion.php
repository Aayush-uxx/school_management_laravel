<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'version_number',
    'label',
    'status',
    'generated_reason',
    'fingerprint',
    'created_by',
    'generated_at',
])]
class TimetableVersion extends Model
{
    public function rows(): HasMany
    {
        return $this->hasMany(Timetable::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    protected function casts(): array
    {
        return [
            'generated_at' => 'datetime',
        ];
    }
}
